include("resource://lasuli/modules/Observers.js");
include("resource://lasuli/modules/log4moz.js");
include("resource://lasuli/modules/Base64.js");

lasuli.contextmenu = {
  init : function(){
    var logger = Log4Moz.repository.getLogger("lasuli.contextmenu.init");
    this.mainWindow = window.QueryInterface(Ci.nsIInterfaceRequestor)
                   .getInterface(Ci.nsIWebNavigation)
                   .QueryInterface(Ci.nsIDocShellTreeItem)
                   .rootTreeItem
                   .QueryInterface(Ci.nsIInterfaceRequestor)
                   .getInterface(Ci.nsIDOMWindow);
    logger.trace('init');
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
    menu.setAttribute('oncommand', "dispatch('lasuli.ui.doHighlightMenuClick', '" + Base64.encode(JSON.stringify({"viewpointID": viewpointID, "topicID": topicID, "name": topicName})) + "' );");
    menu.setAttribute('topicID', topicID);
    menu.setAttribute('viewpointID', viewpointID);
    if(topic.color)
      menu.setAttribute('style','-moz-appearance: none !important; background-color: ' + alpha(topic.color) + ' !important;');
    return menu;
  },

  getContextMenu : function(){
    var logger = Log4Moz.repository.getLogger("lasuli.contextmenu.getContextMenu");
    if(!this.mainWindow) this.init();
    return this.mainWindow.document.getElementById("contentAreaContextMenu");
  },

  //Auto register all observers
  register: function(){
    var logger = Log4Moz.repository.getLogger("lasuli.contextmenu.register");
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
    var logger = Log4Moz.repository.getLogger("lasuli.contextmenu.doHide");
    //logger.trace("disable");
    var cm = this.getContextMenu();
    for (var i = 0, node; node = cm.childNodes[i]; i++){
      //logger.trace(node.getAttribute("id"));
      if(node.getAttribute("id") == 'lasuliContextMenu')
        cm.removeChild(node);
    }
  },

  doShow: function(topics){
    var logger = Log4Moz.repository.getLogger("lasuli.contextmenu.doShow");
    //Clear the menu items
    this.doHide();

    this.topics = this._appendDefaultTopic(topics);
    //logger.trace(this.topics);
    var cm;
    try{
      cm = this.getContextMenu();
    }catch(e){
      logger.fatal(e);
    }
    //logger.trace("show menu");
    var menu = this.mainWindow.document.createElement('menu');
    menu.setAttribute('id', 'lasuliContextMenu');
    menu.setAttribute('label', _("lasuli.contextMenu"));
    menu.setAttribute('insertafter', "context-cut");
    var menupopup = this.mainWindow.document.createElement('menupopup');
    menupopup.setAttribute('id', 'lasuliMenuPopup');
    menu.appendChild(menupopup);
    for each(var topic in this.topics)
    {
      //logger.trace(topic);
      var menuitem = this._createItem(topic);
      menupopup.appendChild(menuitem);
    }
    //logger.trace("appendChild");

    cm.appendChild(menu);
    //logger.trace("this.cacm.appendChild");
    if(this.topics['new'])
      delete this.topcis['new'];
  },

  doAddMenuItem : function(topic){
    var logger = Log4Moz.repository.getLogger("lasuli.contextmenu.doAddMenuItem");
    logger.trace(topic);
    logger.trace(typeof(this.mainWindow));
    var menupopup = this.mainWindow.document.getElementById('lasuliMenuPopup');
    logger.trace(typeof(menupopup));
    logger.trace(menupopup.childNodes.length);
    var lastNode = menupopup.childNodes[menupopup.childNodes.length -1];
    var menuitem = this._createItem(topic);
    menupopup.insertBefore(menuitem,lastNode);
    this.topics[topic.topicID] = topic;

    /*topic = {"name": _('new.topic.for.analysis')};
    var menuitem = this._createItem(topic);
    menupopup.appendChild(menuitem);
    this.topics['new'] = topic;*/
  },

  doRemoveMenuItem: function(topicID){
    var menupopup = this.mainWindow.document.getElementById('lasuliMenuPopup');
    var menuitem =  this.mainWindow.document.getElementById('lasuli_menuitem_' + topicID);
    menupopup.removeChild(menuitem);

    delete this.topics[topicID];
  },

  doUpdateMenuItem : function(arg){
    var logger = Log4Moz.repository.getLogger("lasuli.contextmenu.doUpdateMenuItem");
    logger.trace(arg);
    var menuitem =  this.mainWindow.document.getElementById('lasuli_menuitem_' + arg.topicID);
    menuitem.setAttribute('label', arg.name);
    logger.trace(arg);
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
