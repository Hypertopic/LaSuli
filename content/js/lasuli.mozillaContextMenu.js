include("resource://lasuli/modules/Observers.js");

lasuli.contextmenu = {
  init : function(){
    this.mainWindow = window.QueryInterface(Ci.nsIInterfaceRequestor)
                   .getInterface(Ci.nsIWebNavigation)
                   .QueryInterface(Ci.nsIDocShellTreeItem)
                   .rootTreeItem
                   .QueryInterface(Ci.nsIInterfaceRequestor)
                   .getInterface(Ci.nsIDOMWindow);
  },

  _appendDefaultTopic : function(topics){
    topics = topics || {};

    if(topics['new'])
      delete topics['new'];

    topics['new'] = {"name": _('new.topic.for.analysis')};
    return topics;
  },

  _createItem : function(topic){
    var menu = this.mainWindow.document.createElement('menuitem');
    var topicName = topic.name;
    var topicID = topic.topicID;
    var viewpointID = topic.viewpointID;
    menu.setAttribute('id', 'lasuli_menuitem_' + topic.topicID);
    menu.setAttribute('label', topic.name);
    menu.setAttribute('insertafter', "context-sep-selectall");
    menu.setAttribute('oncommand', "dispatch('lasuli.ui.doHighlightMenuClick', " + JSON.stringify({viewpointID: viewpointID, topicID: topicID, name: topicName}) + ")");
    menu.setAttribute('topicID', topicID);
    menu.setAttribute('viewpointID', viewpointID);
    if(topic.color)
      menu.setAttribute('style','-moz-appearance: none !important; background-color: ' + alpha(topic.color) + ' !important;');
    return menu;
  },

  getContextMenu : function(){
    if(!this.mainWindow) this.init();
    return this.mainWindow.document.getElementById("contentAreaContextMenu");
  },

  //Auto register all observers
  register: function(){
    for(var func in this)
      if(func.substr(0, 2) == "do")
        Observers.add("lasuli.contextmenu." + func, lasuli.contextmenu[func], lasuli.contextmenu);
  },
  unregister: function(){
    for(var func in this)
      if(func.substr(0, 2) == "do")
        Observers.remove("lasuli.contextmenu." + func, lasuli.contextmenu[func], lasuli.contextmenu);
  },
  doHide: function(){
    var cm = this.getContextMenu();
    for (var i = 0, node; node = cm.childNodes[i]; i++){
      if(node.getAttribute("id") == 'lasuliContextMenu')
        cm.removeChild(node);
    }
  },

  doShow: function(topics){
    //Clear the menu items
    this.doHide();

    this.topics = this._appendDefaultTopic(topics);
    var cm;
    try{
      cm = this.getContextMenu();
    }catch(e){
      console.error(e);
    }
    var menu = this.mainWindow.document.createElement('menu');
    menu.setAttribute('id', 'lasuliContextMenu');
    menu.setAttribute('label', _("lasuli.contextMenu"));
    menu.setAttribute('insertafter', "context-cut");
    var menupopup = this.mainWindow.document.createElement('menupopup');
    menupopup.setAttribute('id', 'lasuliMenuPopup');
    menu.appendChild(menupopup);
    for (var topic of Iterator(this.topics)) {
      var menuitem = this._createItem(topic[1]);
      menupopup.appendChild(menuitem);
    }
    cm.appendChild(menu);
    if(this.topics['new'])
      delete this.topics['new'];
  },

  doAddMenuItem : function(topic){
    var menupopup = this.mainWindow.document.getElementById('lasuliMenuPopup');
    var lastNode = menupopup.childNodes[menupopup.childNodes.length -1];
    var menuitem = this._createItem(topic);
    menupopup.insertBefore(menuitem,lastNode);
    this.topics[topic.topicID] = topic;
  },

  doRemoveMenuItem: function(topicID){
    var menupopup = this.mainWindow.document.getElementById('lasuliMenuPopup');
    var menuitem =  this.mainWindow.document.getElementById('lasuli_menuitem_' + topicID);
    menupopup.removeChild(menuitem);

    delete this.topics[topicID];
  },

  doUpdateMenuItem : function(arg){
    var menuitem =  this.mainWindow.document.getElementById('lasuli_menuitem_' + arg.topicID);
    menuitem.setAttribute('label', arg.name);
    this.topics[arg.topicID].name = arg.name;
  }
}

window.addEventListener("load", function() {
  lasuli.contextmenu.init();
  lasuli.contextmenu.register();
}, false);

window.addEventListener("unload", function() {
  lasuli.contextmenu.unregister();
}, false);
