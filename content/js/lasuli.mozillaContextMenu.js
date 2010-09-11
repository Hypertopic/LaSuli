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
    menu.setAttribute('oncommand', "Observers.notify('lasuli.core.doHighlightMenuClick', '" + JSON.stringify({"viewpointID": viewpointID, "topicID": topicID, "name": topicName}) + "' );");
    menu.setAttribute('topicID', topicID);
    menu.setAttribute('viewpointID', viewpointID);
    if(topic.color)
      menu.setAttribute('style','-moz-appearance: none !important; background-color: ' + topic.color + ' !important;');
    return menu;
  },

  init : function(){
    var logger = Log4Moz.repository.getLogger("lasuli.contextmenu.init");
    this.mainWindow = window.QueryInterface(Ci.nsIInterfaceRequestor)
                   .getInterface(Ci.nsIWebNavigation)
                   .QueryInterface(Ci.nsIDocShellTreeItem)
                   .rootTreeItem
                   .QueryInterface(Ci.nsIInterfaceRequestor)
                   .getInterface(Ci.nsIDOMWindow);
    logger.debug('init');
    this.cacm = this.mainWindow.document.getElementById("contentAreaContextMenu");
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
    //logger.debug("disable");
    for (var i = 0, node; node = this.cacm.childNodes[i]; i++){
      //logger.debug(node.getAttribute("id"));
      if(node.getAttribute("id") == 'lasuliContextMenu')
        this.cacm.removeChild(node);
    }
  },

  doShow: function(topics){
    var logger = Log4Moz.repository.getLogger("lasuli.contextmenu.doShow");
    //Clear the menu items
    this.doHide();
    //logger.debug(topics);
    if(!topics)
      topics = new Array();

    this.topics = this._appendDefaultTopic(topics);

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
    this.cacm.appendChild(menu);
  },

  doAddMenuItem : function(topic){
    var topics = this.topics;
    if(topics && topics.length > 0)
      topics[topics.length - 1] = topic;
    else
      topics = new Array(topic);
    this.doShow(topics);
  },

  doUpdateMenuItem : function(arg){
    var logger = Log4Moz.repository.getLogger("lasuli.contextmenu.doUpdateMenuItem");
    //logger.debug(arg);
    for(var i=0, topic; topic = this.topics[i]; i++)
    {
      if(topic.id == arg.topicID || topic.topicID == arg.topicID)
        this.topics[i].name = arg.name;
    }
    this.doShow(this.topics);
  }
}

window.addEventListener("load", function() {
  lasuli.contextmenu.init();
  lasuli.contextmenu.register();
}, false);

window.addEventListener("unload", function() {
  lasuli.contextmenu.unregister();
}, false);