include("resource://lasuli/modules/Observers.js");
include("resource://lasuli/modules/log4moz.js");
include("resource://lasuli/modules/Sync.js");

lasuli.highlighter = {
  // Get TreeWalker Object
  getTreeWalker : function(m_document)
  {
    try{
      var treewalker = m_document.createTreeWalker(m_document.body,
      NodeFilter.SHOW_TEXT,
      { acceptNode: function(node)
        {
          // only get text content
          if(node.nodeType != 3 || node.data.length == 0)
            return NodeFilter.FILTER_REJECT;

          // Filter the <script> content
          var m_parent = node.parentNode;
          if(m_parent && m_parent.tagName == "SCRIPT")
            return NodeFilter.FILTER_REJECT;

          return NodeFilter.FILTER_ACCEPT;
        }
      },
      false);
      return treewalker;
    }catch(e){
      return null;
    }
  },

  clearDocument : function(m_document){
    if(this.nodeList)
      for(var i=0, nl; nl = nodeList[i]; i++)
        nl.newNode.l_parentNode.replaceChild(nl.originalNode, nl.newNode);
    else
    {
      var nodes = m_document.querySelectorAll("span." + lasuli._class);
      for(var i = 0, node; node = nodes[i]; i++)
      {
        var p_node = node.parentNode;
        if(p_node)
        {
          var m_textNode = m_document.createTextNode(node.textContent);
          p_node.replaceChild(m_textNode, node);
        }
      }
    }
  },

  getContentDocument : function(){
    var wm = Components.classes["@mozilla.org/appshell/window-mediator;1"]
                   .getService(Components.interfaces.nsIWindowMediator);
    var win = wm.getMostRecentWindow("navigator:browser");
    return win.getBrowser().contentDocument;
  },

  doHighlight: function(arg)
  {
    var startTime = new Date().getTime();
    var logger = Log4Moz.repository.getLogger("lasuli.highlighter.doHighlight");
    //logger.trace(arg);
    var fragments = arg.fragments;
    logger.trace(fragments);
    this.fragments = fragments;
    var isAnchor = (arg.isAnchor) ? true : false;

    var m_document;
    if(!arg.domWindow){
      m_document = this.getContentDocument();
      if(m_document.readyState != 'complete'){
        //logger.trace("not loaded yet");
        return false;
      }
    }
    else{
      //logger.debug("with domWindow");
      m_document = arg.domWindow.document;
    }
    //logger.trace("clearDocument");
    //logger.debug(m_document.location.href);
    //logger.debug(m_document.location.hash);
    if(isAnchor)
      this.doRemoveFragment('lasuli_anchor_id');
    else
      this.clearDocument(m_document);

    //logger.trace(fragments);

    var coordinates = [];
    for (var fragment of fragments) {
      coordinates.push(fragment.startPos);
      coordinates.push(fragment.endPos);
    }
    //logger.trace("doHighlight::coordinates");
    //logger.trace(coordinates);

    coordinates = coordinates.unique();
    coordinates.sort(function(a,b){return a - b});
    //logger.trace(coordinates);

    if(coordinates.length == 0) return;

    var treewalker;

    treewalker = this.getTreeWalker(m_document);

    if(!treewalker)
    {
      logger.fatal("cannot get treewalker");
      return;
    }

    var startPos = 0, endPos;
    var nodeList = [];
    while(treewalker.nextNode())
    {
      if(startPos > coordinates[coordinates.length -1])
        break;

      var node = treewalker.currentNode;
      var m_parent = node.parentNode;
      var m_text = node.data;
      endPos = startPos + m_text.length;
      if(endPos < coordinates[0])
      {
        startPos = endPos;
        continue;
      }

      var xPos = [];
      xPos.push(startPos);
      xPos.push(endPos);
      for(var i=0, pos; pos = coordinates[i]; i++)
        if(pos >= startPos && pos < endPos)
          xPos.push(pos);

      xPos = xPos.unique();
      xPos.sort(function(a,b){return a - b});

      var needToBeReplaced = false;
      var rNode = m_document.createElement("span");
      for(var i=0; i < xPos.length-1; i++)
      {
        var absStartPos = xPos[i] - startPos;
        var absEndPos = xPos[i+1] - startPos;

        var bgColor = null;
        var cssClasses = lasuli._class;
        for(var fragmentID in fragments)
        {
          fragment = fragments[fragmentID];
          if(xPos[i] >= fragment.startPos && xPos[i] < fragment.endPos)
          {
            if(!fragment.color)
              bgColor = "#FFFF00";
            else
              bgColor = (bgColor) ? getColorOverlay(bgColor, fragment.color) : fragment.color;
            cssClasses +=  " _" + fragmentID;
          }
        }
        var subText = m_text.substring(absStartPos, absEndPos);

        var aNode = m_document.createElement("span");
        m_textNode = m_document.createTextNode(subText);
        aNode.appendChild(m_textNode);
        aNode.setAttribute("class",cssClasses);

        if(bgColor)
        {
          needToBeReplaced = true;
          aNode.setAttribute("style", "background-color: "+ alpha(bgColor));
          aNode.setAttribute("id", lasuli._htClass + xPos[i]);
        }

        rNode.appendChild(aNode);
      }

      if(needToBeReplaced)
          nodeList.push({originalNode: node, newNode: rNode});

      startPos = endPos;
    }

    //var_dump("[highlighter.js] doHighlight::nodeList", nodeList.length, 4);
    for(var i=0, nl; nl = nodeList[i]; i++){
      nodeList[i].newNode.l_parentNode = nl.originalNode.parentNode;
      nl.originalNode.parentNode.replaceChild(nl.newNode, nl.originalNode);
    }

    var endTime = new Date().getTime();
    logger.debug("Execution time: " + (endTime - startTime) + "ms");
  },

  doClear: function()
  {
    var wm = Components.classes["@mozilla.org/appshell/window-mediator;1"]
           .getService(Components.interfaces.nsIWindowMediator);
    for (var index = 0, tabbrowser = wm.getEnumerator('navigator:browser').getNext().getBrowser();
       index < tabbrowser.mTabs.length; index++)
    {
      var m_gBrowser = tabbrowser.getBrowserAtIndex(index);
      var m_document = m_gBrowser.contentDocument;
      this.clearDocument(m_document);
    }
  },

  doScrollTo: function(fragmentID){
    var logger = Log4Moz.repository.getLogger("lasuli.highlighter.doScrollTo");
    logger.trace(fragmentID);
    var m_document = this.getContentDocument();
    logger.trace(m_document.location.href);
    var nodes = m_document.querySelectorAll("span._" + fragmentID);
    logger.trace(nodes.length);
    if(nodes.length == 0)
      return;
    nodes[0].scrollIntoView(true);
  },

  doRemoveFragment : function(fragmentID){
    var logger = Log4Moz.repository.getLogger("lasuli.highlighter.doRemoveFragment");
    var m_document = this.getContentDocument();
    var nodes = m_document.querySelectorAll("span._" + fragmentID);
    logger.trace(nodes.length);
    if(nodes.length == 0)
      return;

    if(fragmentID == "lasuli_anchor_id")
    {
      for(var i=0, node; node = nodes[i]; i++){
        node.removeAttribute("style");
        var classes = node.getAttribute("class");
        classes = classes.split(" ");
        for(var j=0, classN; classN= classes[j]; j++)
        {
          classN = classN.substr(1);
          if(classN == fragmentID)
          {
            classes.splice(j, 1);
            j--;
          }
        }
        node.setAttribute("class", classes.join(' '));
      }
      return false;
    }
    for(var i=0, node; node = nodes[i]; i++){
      var classes = node.getAttribute("class");
      var bgColor = null;
      logger.trace(classes);
      classes = classes.split(" ");
      for(var j=0, className; className = classes[j]; j++){
        var fragID = className.substr(1);
        if(fragID in this.fragments && fragID != fragmentID)
          bgColor = (bgColor) ? colorUtil.colorCalc(bgColor, this.fragments[fragID].color) : this.fragments[fragID].color;
      }
      logger.trace(bgColor);
      if(bgColor)
        node.setAttribute("style", "background-color: "+ alpha(bgColor));
      else
        node.removeAttribute("style");
    }
  },

  doReColorFragment: function(fragmentID, color){
    var logger = Log4Moz.repository.getLogger("lasuli.highlighter.doReColorFragment");
    var m_document = this.getContentDocument();
    var nodes = m_document.querySelectorAll("span._" + fragmentID);
    //logger.trace(nodes.length);
    //logger.trace(fragmentID);
    //logger.trace(color);
    if(nodes.length == 0)
      return;
    this.fragments[fragmentID].color = color;

    for(var i=0, node; node = nodes[i]; i++){
      var classes = node.getAttribute("class");
      var bgColor = null;
      //logger.trace(classes);
      classes = classes.split(" ");
      for(var j=0, className; className = classes[j]; j++){
        var fragID = className.substr(1);
        if(fragID in this.fragments)
          bgColor = (bgColor) ? colorUtil.colorCalc(bgColor, this.fragments[fragID].color) : this.fragments[fragID].color;
      }

      //logger.trace(bgColor);
      if(bgColor)
        node.setAttribute("style", "background-color: "+ alpha(bgColor));
      else
        node.removeAttribute("style");
    }
  },

  doHighlightAnchor: function(UrlHash){
    var logger = Log4Moz.repository.getLogger("lasuli.highlighter.doHighlightAnchor");
    //logger.debug(UrlHash);
    var m_document = this.getContentDocument();
    if(m_document.readyState != 'complete') return false;
    var hashFragment = UrlHash || m_document.location.hash;
    //logger.debug(hashFragment);
    if(typeof hashFragment != 'string') return false;
    var coordinates = hashFragment.substr(1).split('+');
    if(coordinates.length != 2) return false;
    var startPos, endPos;
    try{
      startPos = parseInt(coordinates[0]);
      endPos =parseInt(coordinates[1]);
      if(typeof startPos == "number" && typeof endPos == "number"
           && startPos >=0 && endPos >=0 && startPos != endPos)
      {
        if(startPos > endPos)
        {
          var tmp = startPos;
          startPos = endPos;
          endPos = tmp;
        }
      }
      else
        return false;
    }catch(e){
      logger.fatal(e);
      return false;
    }
    var fragments = {"lasuli_anchor_id": {"startPos": startPos, "endPos": endPos, "color": "#FF8000"}};
    //logger.debug(fragments);
    this.doHighlight({"fragments": fragments, "isAnchor": true});
    this.doScrollTo('lasuli_anchor_id');
  },

  //Auto register all observers
  register: function(){
    var logger = Log4Moz.repository.getLogger("lasuli.highlighter.register");
    for(var func in this)
      if(func.substr(0, 2) == "do")
        Observers.add("lasuli.highlighter." + func, lasuli.highlighter[func], lasuli.highlighter);
    //logger.trace("registered");
  },

  unregister: function(){
    for(var func in this)
      if(func.substr(0, 2) == "do")
        Observers.remove("lasuli.highlighter." + func, lasuli.highlighter[func], lasuli.highlighter);
  }
}

window.addEventListener("load", function() {
  lasuli.highlighter.register();
}, false);

window.addEventListener("unload", function() {
  lasuli.highlighter.unregister();
}, false);
