include("resource://lasuli/modules/Observers.js");
include("resource://lasuli/modules/log4moz.js");


var mozillaContextMenu = {
  set topics(topics){
    this._topics = topics || new Array();  
    this._topics.push({"name": _('new.topic.for.analysis')});
  },
  
	init : function(){
	  var logger = Log4Moz.repository.getLogger("mozillaContextMenu.init");
	  this.mainWindow = window.QueryInterface(Ci.nsIInterfaceRequestor)
                   .getInterface(Ci.nsIWebNavigation)
                   .QueryInterface(Ci.nsIDocShellTreeItem)
                   .rootTreeItem
                   .QueryInterface(Ci.nsIInterfaceRequestor)
                   .getInterface(Ci.nsIDOMWindow);
    logger.debug('init');
    this.cacm = this.mainWindow.document.getElementById("contentAreaContextMenu");
	},
	
	disable: function(){
	  var logger = Log4Moz.repository.getLogger("mozillaContextMenu.disable");
	  logger.debug("disable");
	  for (var i = 0, node; node = this.cacm.childNodes[i]; i++){
	    logger.debug(node.getAttribute("id"));
	    if(node.getAttribute("id") == 'lasuliContextMenu')
	      this.cacm.removeChild(node);
	  }
	},
	
	enable: function(){
	  var logger = Log4Moz.repository.getLogger("mozillaContextMenu.enable");
	  var menu = this.mainWindow.document.createElement('menu');
	  menu.setAttribute('id', 'lasuliContextMenu');
	  menu.setAttribute('label', _("lasuliContextMenu"));
    menu.setAttribute('insertafter', "context-cut");
    var menupopup = this.mainWindow.document.createElement('menupopup');
    menupopup.setAttribute('id', 'lasuliMenuPopup');
    menu.appendChild(menupopup);
    logger.debug(this._topics.length);
	  for(var i=0, topic; topic = this._topics[i]; i++)
	  {
	    logger.debug("topic");
	    logger.debug(topic);
	    var menuitem = this._createItem(topic);
	    menupopup.appendChild(menuitem);
    }
    this.cacm.appendChild(menu);	    
	},
	
	_createItem : function(topic){
	  var menu = this.mainWindow.document.createElement('menuitem');
	  var topicName = topic.name;
	  var topicID = topic.topicID || topic.id;
	  var viewpointID = topic.viewpointID || topic.viewpoint;
	  
	  topic = {"viewpointID": viewpointID, "topicID": topicID, "name": topicName};

    menu.setAttribute('label', topic.name);
    menu.setAttribute('insertafter', "context-sep-selectall");
    menu.setAttribute('oncommand', "Observers.notify('lasuli.core.doHighlightMenuClick', '" + JSON.stringify(topic) + "' );");
    menu.setAttribute('topicID', topicID);
    menu.setAttribute('viewpointID', viewpointID);
  	if(topic.color)
    	menu.setAttribute('style','-moz-appearance: none !important; background-color: ' + topic.color + ' !important;');
    return menu;
	}
}

window.addEventListener("load", function() {
  mozillaContextMenu.init();
  Observers.add("lasuli.contextmenu.enable", mozillaContextMenu.enable, mozillaContextMenu);
  Observers.add("lasuli.contextmenu.disable", mozillaContextMenu.disable, mozillaContextMenu);
}, false);

window.addEventListener("unload", function() {
  Observers.remove("lasuli.contextmenu.enable", mozillaContextMenu.enable, mozillaContextMenu);
  Observers.remove("lasuli.contextmenu.disable", mozillaContextMenu.disable, mozillaContextMenu);
}, false);