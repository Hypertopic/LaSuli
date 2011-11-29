var wm = Components.classes["@mozilla.org/appshell/window-mediator;1"]
               .getService(Components.interfaces.nsIWindowMediator);
var win = wm.getMostRecentWindow("navigator:browser");
var contentDocument = win.getBrowser().contentDocument;

try{
  treewalker = contentDocument.createTreeWalker(contentDocument.body,
  NodeFilter.SHOW_TEXT,
  { acceptNode: function(node)
    {

      
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

//var range = contentDocument.createRange();


//var firstnode;
while(treewalker.nextNode())
{
    var node = treewalker.currentNode;
    print("|" + node.nodeValue + "|");
    // if(!firstnode){
      // range.setStart(node, 0);
      // firstnode = node;
    // }
    // else
    // {
      // range.setEnd(node, 0);
      // print(range.toString());
      // print(range.toString().length);
    // }
    
}