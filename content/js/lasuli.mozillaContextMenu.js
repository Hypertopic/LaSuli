include("resource://lasuli/modules/Observers.js");
include("resource://lasuli/modules/log4moz.js");

lasuli.contextmenu = {
  _appendDefaultTopic : function(topics){
    topics = topics || {};

    if(topics['new'] == _('new.topic.for.analysis'))
      return topics;
    else
      topics['new'] = {"name": _('new.topic.for.analysis')};

    return topics;
  },

  _createItem : function(topic){
    var menu = this.mainWindow.document.createElement('menuitem');
    var topicName = topic.name;
    var topicID = topic.topicID;
    var viewpointID = topic.viewpointID;

    menu.setAttribute('label', topic.name);
    menu.setAttribute('insertafter', "context-sep-selectall");
    menu.setAttribute('oncommand', "dispatch('lasuli.ui.doHighlightMenuClick', '" + JSON.stringify({"viewpointID": viewpointID, "topicID": topicID, "name": topicName}) + "' );");
    menu.setAttribute('topicID', topicID);
    menu.setAttribute('viewpointID', viewpointID);
    if(topic.color)
      menu.setAttribute('style','-moz-appearance: none !important; background-color: ' + topic.color + ' !important;');
    return menu;
  },

  getContextMenu : function(){
    var logger = Log4Moz.repository.getLogger("lasuli.contextmenu.getContextMenu");
    this.mainWindow = window.QueryInterface(Ci.nsIInterfaceRequestor)
                   .getInterface(Ci.nsIWebNavigation)
                   .QueryInterface(Ci.nsIDocShellTreeItem)
                   .rootTreeItem
                   .QueryInterface(Ci.nsIInterfaceRequestor)
                   .getInterface(Ci.nsIDOMWindow);
    logger.debug('init');
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
    logger.debug("disable");
    var cm = this.getContextMenu();
    for (var i = 0, node; node = cm.childNodes[i]; i++){
      //logger.debug(node.getAttribute("id"));
      if(node.getAttribute("id") == 'lasuliContextMenu')
        cm.removeChild(node);
    }
  },

  doShow: function(topics){
    var logger = Log4Moz.repository.getLogger("lasuli.contextmenu.doShow");
    //Clear the menu items
    this.doHide();
    //logger.debug(topics);

    this.topics = this._appendDefaultTopic(topics);

    var cm = this.getContextMenu();
    //logger.debug("show menu");
    var menu = this.mainWindow.document.createElement('menu');
    menu.setAttribute('id', 'lasuliContextMenu');
    menu.setAttribute('label', _("lasuli.contextMenu"));
    menu.setAttribute('insertafter', "context-cut");
    var menupopup = this.mainWindow.document.createElement('menupopup');
    menupopup.setAttribute('id', 'lasuliMenuPopup');
    menu.appendChild(menupopup);
    for each(var topic in topics)
    {
      logger.debug(topic);
      var menuitem = this._createItem(topic);
      menupopup.appendChild(menuitem);
    }
    logger.debug("appendChild");

    cm.appendChild(menu);
    logger.debug("this.cacm.appendChild");
  },

  doAddMenuItem : function(topic){
    var logger = Log4Moz.repository.getLogger("lasuli.contextmenu.doAddMenuItem");
    logger.debug(topic);
    delete this.topics['new'];
    this.topics[topic.topicID] = topic;
    this.doShow(this.topics);
  },

  doRemoveMenuItem: function(topicID){
    delete this.topics[topicID];
    this.doShow(this.topics);
  },

  doUpdateMenuItem : function(arg){
    var logger = Log4Moz.repository.getLogger("lasuli.contextmenu.doUpdateMenuItem");
    //logger.debug(arg);
    this.topics[arg.topicID].name = arg.name;
    this.doShow(this.topics);
  }
}

window.addEventListener("load", function() {
  lasuli.contextmenu.register();
}, false);

window.addEventListener("unload", function() {
  lasuli.contextmenu.unregister();
}, false);