include("resource://lasuli/modules/Observers.js");
include("resource://lasuli/modules/log4moz.js");
include("resource://lasuli/modules/Sync.js");

Array.prototype.unique = function( b ) {
 var a = [], i, l = this.length;
 for( i=0; i<l; i++ ) {
  if( a.indexOf( this[i], 0, b ) < 0 ) { a.push( this[i] ); }
 }
 return a;
};

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
  },

  getContentDocument : function(){
    var wm = Components.classes["@mozilla.org/appshell/window-mediator;1"]
                   .getService(Components.interfaces.nsIWindowMediator);
    var win = wm.getMostRecentWindow("navigator:browser");
    return win.getBrowser().contentDocument;
  },

  doHighlight: function(arg)
  {
    var logger = Log4Moz.repository.getLogger("lasuli.highlighter.doHighlight");
    logger.trace(arg);
    var fragments = arg.fragments;
    logger.trace(fragments);
    this.fragments = fragments;

    var m_document;
    if(!arg.domWindow){
      m_document = this.getContentDocument();
      if(m_document.readyState != 'complete'){
        logger.trace("not loaded yet");
        return false;
      }
    }
    else{
      logger.trace("with domWindow");
      m_document = arg.domWindow.document;
    }
    logger.trace("clearDocument");
    logger.trace(m_document.location.href);
    this.clearDocument(m_document);

    logger.trace(fragments);

    var coordinates = [];
    for each(var fragment in fragments)
    {
      coordinates.push(fragment.startPos);
      coordinates.push(fragment.endPos);
    }

    coordinates = coordinates.unique();
    coordinates.sort(function(a,b){return a - b});
    logger.trace("doHighlight::coordinates");
    logger.trace(coordinates);

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
              bgColor = "Yellow";
            else
              bgColor = (bgColor) ? colorUtil.colorCalc(bgColor, fragment.color) : fragment.color;
            cssClasses +=  " _" + fragmentID;
          }
        }
        logger.trace(cssClasses);
        var subText = m_text.substring(absStartPos, absEndPos);

        var aNode = m_document.createElement("span");
        m_textNode = m_document.createTextNode(subText);
        aNode.appendChild(m_textNode);
        aNode.setAttribute("class",cssClasses);

        if(bgColor)
        {
          needToBeReplaced = true;
          aNode.setAttribute("style", "background-color: "+ bgColor);
          aNode.setAttribute("id", lasuli._htClass + xPos[i]);
        }

        rNode.appendChild(aNode);
      }

      if(needToBeReplaced)
          nodeList.push({originalNode: node, newNode: rNode});

      startPos = endPos;
    }

    //var_dump("[highlighter.js] doHighlight::nodeList", nodeList.length, 4);
    for(var i=0, nl; nl = nodeList[i]; i++)
      nl.originalNode.parentNode.replaceChild(nl.newNode, nl.originalNode);
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
        node.setAttribute("style", "background-color: "+ bgColor);
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
        node.setAttribute("style", "background-color: "+ bgColor);
      else
        node.removeAttribute("style");
    }
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