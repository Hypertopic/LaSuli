include("resource://lasuli/modules/Observers.js");
include("resource://lasuli/modules/log4moz.js");

Array.prototype.unique = function( b ) {
 var a = [], i, l = this.length;
 for( i=0; i<l; i++ ) {
  if( a.indexOf( this[i], 0, b ) < 0 ) { a.push( this[i] ); }
 }
 return a;
};

lasuli.highlighter = {

  fragments: null,

  getColorOverlay: function(fragments)
  {
    fragments = [{startPos:100, endPos: 200, bgColor:"#FF0000"},
    {startPos:150, endPos: 250, bgColor:"#0000FF"},
    {startPos:350, endPos: 400, bgColor:"#80FF00"},
    {startPos:380, endPos: 460, bgColor:"#FF80FF"},
    {startPos:400, endPos: 450, bgColor:"#FFFF00"},
    {startPos:500, endPos: 1000, bgColor:"#BEBEBE"}];

    return fragments;
  },

  // Get TreeWalker Object
  getTreeWalker : function()
  {
    var m_document = this.getContentDocument();

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

  getContentDocument : function(){
    var wm = Components.classes["@mozilla.org/appshell/window-mediator;1"]
                   .getService(Components.interfaces.nsIWindowMediator);
    var win = wm.getMostRecentWindow("navigator:browser");
    return win.getBrowser().contentDocument;
  },

  doHighlight: function(fragments)
  {
    var logger = Log4Moz.repository.getLogger("lasuli.highlighter.doHighlight");
    fragments = (fragments) ? fragments : this.fragments;
    logger.debug(fragments);

    var coordinates = [];
    for each(var fragment in fragments)
    {
      coordinates.push(fragment.startPos);
      coordinates.push(fragment.endPos);
    }

    coordinates = coordinates.unique();
    coordinates.sort(function(a,b){return a - b});
    logger.debug("doHighlight::coordinates");
    logger.debug(coordinates);

    if(coordinates.length == 0) return;

    var m_document = this.getContentDocument();

    var treewalker = this.getTreeWalker();
    if(!treewalker) return;

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

      //var_dump("[highlight.js]doHighlight()::node.tagName", node.tagName, 4);
      //var_dump("[highlight.js]doHighlight()::m_parent.tagName", m_parent.tagName, 4);
      //var_dump("[highlight.js]doHighlight()::startPos", startPos, 4);
      //var_dump("[highlight.js]doHighlight()::endPos", endPos, 4);

      var xPos = [];
      xPos.push(startPos);
      xPos.push(endPos);
      for(var i=0, pos; pos = coordinates[i]; i++)
        if(pos >= startPos && pos < endPos)
          xPos.push(pos);

      xPos = xPos.unique();
      xPos.sort(function(a,b){return a - b});
      //var_dump("[highlighter.js] doHighlight::xPos", xPos, 4);

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
            bgColor = (fragment.color) ? fragment.color : "Yellow" ;
            cssClasses +=  " " + fragmentID;
          }
        }
        logger.debug(cssClasses);
        var subText = m_text.substring(absStartPos, absEndPos);
        //if(bgColor)
        //  var_dump("[highlighter.js] doHighlight::subText", bgColor + " [" + xPos[i] + "," + xPos[i+1] + ") " + subText, 4);

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

  //Auto register all observers
  register: function(){
    var logger = Log4Moz.repository.getLogger("lasuli.highlighter.register");
    for(var func in this)
      if(func.substr(0, 2) == "do")
        Observers.add("lasuli.highlighter." + func, lasuli.highlighter[func], lasuli.highlighter);
    logger.debug("registered");
  },

  unregister: function(){
    for(var func in this)
      if(func.substr(0, 2) == "do")
        Observers.remove("lasuli.highlighter." + func, lasuli.highlighter[func], lasuli.highlighter);
  }
}

window.addEventListener("load", function() {
  //lasuli.setupLogging();
  lasuli.highlighter.register();
}, false);

window.addEventListener("unload", function() {
  lasuli.highlighter.unregister();
}, false);