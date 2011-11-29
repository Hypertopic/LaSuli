var wm = Components.classes["@mozilla.org/appshell/window-mediator;1"]
               .getService(Components.interfaces.nsIWindowMediator);
var win = wm.getMostRecentWindow("navigator:browser");
var contentDocument = win.getBrowser().contentDocument;
var treewalker;

var content = win.getBrowser().contentWindow;
var selection = content.getSelection();
var strContent = selection + "";
strContent = strContent.trim();

var range = selection.getRangeAt(0);
var startContainer = range.startContainer;
var endContainer = range.endContainer;
var startOffset = range.startOffset;
var endOffset = range.endOffset;

try{
  treewalker = contentDocument.createTreeWalker(contentDocument.body,
  NodeFilter.SHOW_TEXT,
  { acceptNode: function(node)
    {
      // only get text content
      if(node.nodeType != 3 || node.data.length == 0 || !/[^\t\n\r ]/.test(node.data))
        return NodeFilter.FILTER_REJECT;

      // Filter the <script> content
      var m_parent = node.parentNode;
      if(m_parent && m_parent.tagName == "SCRIPT")
        return NodeFilter.FILTER_REJECT;

      return NodeFilter.FILTER_ACCEPT;
    }
  },
  false);
}catch(e){
  print(e.message);
}

var curPos = 0;
var startPos,endPos;
while(treewalker.nextNode())
{
    var node = treewalker.currentNode;
    //logger.debug(node.textContent);

    if(node.isSameNode(startContainer)){
      startPos = curPos + startOffset;
      //logger.debug("start:" + startPos);
      //logger.debug("strContent.length:" + strContent.length);
      endPos = startPos + strContent.length;
      //logger.debug("endPos:" + endPos);
      break;
    }
    //logger.debug("in loop startPos:" + startPos + ", endPost:" + endPos);
    curPos += node.data.length;
}
print("startPos:" + startPos + ", endPost:" + endPos);
