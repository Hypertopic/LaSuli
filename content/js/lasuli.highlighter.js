include("resource://lasuli/modules/Observers.js");
include("resource://lasuli/modules/Sync.js");
var window_utils = require("sdk/window/utils");

lasuli.highlighter = {

  clearDocument : function(m_document){
    console.time("lasuli.highlighter.clearDocument");
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
    console.timeEnd("lasuli.highlighter.clearDocument");
  },

  getContentDocument: function() {
    return window_utils.getMostRecentBrowserWindow().content.document;
  },

  doHighlight: function(arg)
  {
    console.time("lasuli.highlighter.doHighlight");
    var fragments = arg.fragments;
    this.fragments = fragments;
    var isAnchor = (arg.isAnchor) ? true : false;

    var m_document;
    if(!arg.domWindow){
      m_document = this.getContentDocument();
      if(m_document.readyState != 'complete'){
        return false;
      }
    }
    else{
      m_document = arg.domWindow.document;
    }
    if(isAnchor)
      this.doRemoveFragment('lasuli_anchor_id');
    else
      this.clearDocument(m_document);

    var coordinates = [];
    for (var f of Iterator(fragments)) {
      var fragment = f[1];
      coordinates.push(fragment.startPos);
      coordinates.push(fragment.endPos);
    }
    coordinates = coordinates.unique();
    coordinates.sort(function(a,b){return a - b});
    if(coordinates.length == 0) return;

    var treewalker;
    treewalker = createTreeWalker(m_document);
    if(!treewalker)
    {
      console.error("cannot get treewalker");
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

    for(var i=0, nl; nl = nodeList[i]; i++){
      nodeList[i].newNode.l_parentNode = nl.originalNode.parentNode;
      nl.originalNode.parentNode.replaceChild(nl.newNode, nl.originalNode);
    }
    console.timeEnd("lasuli.highlighter.doHighlight");
  },

  doClear: function()
  {
    console.time("lasuli.highlighter.doClear");
    var wm = Components.classes["@mozilla.org/appshell/window-mediator;1"]
           .getService(Components.interfaces.nsIWindowMediator);
    for (var index = 0, tabbrowser = wm.getEnumerator('navigator:browser').getNext().getBrowser();
       index < tabbrowser.mTabs.length; index++)
    {
      var m_gBrowser = tabbrowser.getBrowserAtIndex(index);
      var m_document = m_gBrowser.contentDocument;
      this.clearDocument(m_document);
    }
    console.timeEnd("lasuli.highlighter.doClear");
  },

  doScrollTo: function(fragmentID){
    console.time("lasuli.highlighter.doScrollTo");
    var m_document = this.getContentDocument();
    var nodes = m_document.querySelectorAll("span._" + fragmentID);
    if(nodes.length == 0)
      return;
    nodes[0].scrollIntoView(true);
    console.timeEnd("lasuli.highlighter.doScrollTo");
  },

  doRemoveFragment : function(fragmentID){
    console.time("lasuli.highlighter.doRemoveFragment");
    var m_document = this.getContentDocument();
    var nodes = m_document.querySelectorAll("span._" + fragmentID);
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
      classes = classes.split(" ");
      for(var j=0, className; className = classes[j]; j++){
        var fragID = className.substr(1);
        if(fragID in this.fragments && fragID != fragmentID)
          bgColor = (bgColor) ? colorUtil.colorCalc(bgColor, this.fragments[fragID].color) : this.fragments[fragID].color;
      }
      if(bgColor)
        node.setAttribute("style", "background-color: "+ alpha(bgColor));
      else
        node.removeAttribute("style");
    }
    console.timeEnd("lasuli.highlighter.doRemoveFragment");
  },

  doReColorFragment: function(fragmentID, color){
    console.time("lasuli.highlighter.doReColorFragment");
    var m_document = this.getContentDocument();
    var nodes = m_document.querySelectorAll("span._" + fragmentID);
    if(nodes.length == 0)
      return;
    this.fragments[fragmentID].color = color;
    for(var i=0, node; node = nodes[i]; i++){
      var classes = node.getAttribute("class");
      var bgColor = null;
      classes = classes.split(" ");
      for(var j=0, className; className = classes[j]; j++){
        var fragID = className.substr(1);
        if(fragID in this.fragments)
          bgColor = (bgColor) ? colorUtil.colorCalc(bgColor, this.fragments[fragID].color) : this.fragments[fragID].color;
      }
      if(bgColor)
        node.setAttribute("style", "background-color: "+ alpha(bgColor));
      else
        node.removeAttribute("style");
    }
    console.timeEnd("lasuli.highlighter.doReColorFragment");
  },

  doHighlightAnchor: function(UrlHash){
    console.time("lasuli.highlighter.doHighlightAnchor");
    var m_document = this.getContentDocument();
    if(m_document.readyState != 'complete') return false;
    var hashFragment = UrlHash || m_document.location.hash;
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
      console.error(e);
      return false;
    }
    var fragments = {"lasuli_anchor_id": {"startPos": startPos, "endPos": endPos, "color": "#FF8000"}};
    this.doHighlight({"fragments": fragments, "isAnchor": true});
    this.doScrollTo('lasuli_anchor_id');
    console.timeEnd("lasuli.highlighter.doHighlightAnchor");
  },

  //Auto register all observers
  register: function(){
    console.time("lasuli.highlighter.register");
    for(var func in this)
      if(func.substr(0, 2) == "do")
        Observers.add("lasuli.highlighter." + func, lasuli.highlighter[func], lasuli.highlighter);
    console.timeEnd("lasuli.highlighter.register");
  },

  unregister: function(){
    console.time("lasuli.highlighter.unregister");
    for(var func in this)
      if(func.substr(0, 2) == "do")
        Observers.remove("lasuli.highlighter." + func, lasuli.highlighter[func], lasuli.highlighter);
    console.timeEnd("lasuli.highlighter.unregister");
  }
}

window.addEventListener("load", function() {
  lasuli.highlighter.register();
}, false);

window.addEventListener("unload", function() {
  lasuli.highlighter.unregister();
}, false);
