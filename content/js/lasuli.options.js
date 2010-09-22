include("resource://lasuli/modules/Preferences.js");
include("resource://lasuli/modules/XMLHttpRequest.js");

lasuli.options = {
  servers : new Array(),

  init: function(){
    var logger = Log4Moz.repository.getLogger("lasuli.options.init");
    var dialog        = document.getElementById('lasuli-options-dialog');
	  var listDefault   = document.getElementById('list-default');
	  var listUser      = document.getElementById('list-user');
	  var listServer    = document.getElementById('list-server');
	  var btnModify     = document.getElementById('button-modify');
	  var btnAdd        = document.getElementById('button-add');
	  var btnDelete     = document.getElementById('button-delete');
	  var btnDefault    = document.getElementById('button-default');

	  dialog.setAttribute('title', _('options.dialog.title'));
	  listDefault.setAttribute('label', ' ');
	  listUser.setAttribute('label', _('options.list.user'));
	  listServer.setAttribute('label', _('options.list.server'));
	  btnModify.setAttribute('label', _('options.server.modify'));
	  btnAdd.setAttribute('label', _('options.server.add'));
	  btnDelete.setAttribute('label', _('options.server.delete'));
	  btnDefault.setAttribute('label', _('options.server.default'));

	  /*this.servers = new Array({'url': 'http://hypertopic.couchone.com/argos/', 'user':'chao@zhou.fr', 'pass':'', 'default': true},
	                          {'url': 'http://lasuli.couchone.com/argos/', 'user':'chao@hypertopic.org', 'pass':''},
	                          {'url': 'http://lasuli.couchone.com/lasuli/', 'user':'user@hypertopic.org', 'pass':''});
	  Preferences.set("extensions.lasuli.setting",JSON.stringify(this.servers));*/
    //Load setting from preferences
    this.servers = Preferences.get("extensions.lasuli.setting",JSON.stringify(new Array()));
    if(typeof(this.servers) == "string") this.servers = JSON.parse(this.servers);
    this.listServers();
    window.sizeToContent();
  },

  listServers : function(){
    var logger = Log4Moz.repository.getLogger("lasuli.options.listServers");
    var list = document.getElementById('options-list');
    for(var i=0, node; node = list.childNodes[i]; i++){
      logger.debug(node.tagName);
      if(node.tagName == 'listitem'){
        list.removeChild(node);
        i--;
      }
    }

    //Display settings
    for(var i=0, server; server = this.servers[i]; i++)
    {
      var listitem = document.createElement('listitem');
      var listcell = document.createElement('listcell');
      listcell.setAttribute("class", "listcell-iconic");
      if(server.default === true)
        listcell.setAttribute("image", "css/icons/favorite.png");
      listitem.appendChild(listcell);

      listcell = document.createElement('listcell');
      listcell.setAttribute('label', server.user);
      listitem.appendChild(listcell);

      listcell = document.createElement('listcell');
      listcell.setAttribute('label', server.url);
      listitem.appendChild(listcell);

      list.appendChild(listitem);
    }
  },

  okay : function(){
    var logger = Log4Moz.repository.getLogger("lasuli.options.okay");
    var prompts = Cc["@mozilla.org/embedcomp/prompt-service;1"]
                        .getService(Ci.nsIPromptService);
    var found = false;
    for(var i=0, server; server = this.servers[i]; i++)
      if(server.default === true)
        found = true;

    if(!found)
    {
      prompts.alert(window, _('Error'), _('options.error.nodefaultserver'));
      return false;
    }
    var xhr = new XMLHttpRequest();
    xhr.overrideMimeType('application/json');
    for(var i=0, server; server = this.servers[i]; i++)
      try{
        xhr.open('GET', server.url, false);
        xhr.send('');

        if((xhr.status + "").substr(0,1) != '2')
        {
          logger.fatal(xhr.status);
          throw Exception('error');
        }
      }
      catch(e)
      {
        logger.fatal("Ajax Error, xhr.status: " + xhr.status + " " + xhr.statusText + ". \nRequest:\n" + server.url);
        prompts.alert(window, _('Error'), _('options.error.servernotaccessible', [ server.url ]));
        return false;
      }

    Preferences.set("extensions.lasuli.setting",JSON.stringify(this.servers));
    return true;
  },

  getSelectedItem : function(){
    var list = document.getElementById('options-list');
    var i = list.selectedIndex;
    var item = list.selectedItem;
    var cells = item.childNodes;
    var server = {};
    server.default = cells[0].hasAttribute('image');
    server.user = (cells[1].getAttribute('label')) ? cells[1].getAttribute('label') : '';
    server.url = (cells[2].getAttribute('label')) ? cells[2].getAttribute('label') : '';
    return {"list": list, "item": item, "server": server, "selectedIndex": i};
  },

  register: function(){
    for(var func in this)
      if(func.substr(0, 2) == "do")
        Observers.add("lasuli.options." + func, lasuli.options[func], lasuli.options);
  },

  unregister: function(){
    for(var func in this)
      if(func.substr(0, 2) == "do")
        Observers.remove("lasuli.options." + func, lasuli.options[func], lasuli.options);
  },

  doCreate : function(){
    var server = {};
    var dialog = openDialog('dialog.xul', 'server-dialog', 'modal', server);
    dialog.sizeToContent();
    if(server.url && server.user){
      for(i=0; i < this.servers.length; i++)
        if(this.servers[i].user == server.user &&
            this.servers[i].url == server.url)
          return;
      this.servers.push(server);
      this.listServers();
    }
  },

  doModify : function(){
    var logger = Log4Moz.repository.getLogger("lasuli.options.doModify");
    var server = {}, i;
    var obj = this.getSelectedItem();
    logger.debug(obj.server);
    for(i=0; i < this.servers.length; i++)
    {
      logger.debug(this.servers[i]);
      if(this.servers[i].user == obj.server.user &&
          this.servers[i].url == obj.server.url)
      {
        server = this.servers[i];
        break;
      }
    }
    var dialog = openDialog('dialog.xul', 'server-dialog', 'modal', server);
    dialog.sizeToContent();
    if(server.url && server.user){
      this.servers[i].url = server.url;
      this.servers[i].user = server.user;
      this.servers[i].pass = server.pass;
      this.listServers();
    }
  },

  doDelete : function(){
    var logger = Log4Moz.repository.getLogger("lasuli.options.doDelete");
    var obj = this.getSelectedItem();
    for(var i=0; i < this.servers.length; i++)
      if(this.servers[i].user == obj.server.user &&
          this.servers[i].url == obj.server.url)
      {
          this.servers.splice(i, 1);
          break;
      }
    logger.debug(this.servers);
    this.listServers();
    this.doSetButtonStatus();
  },

  doSetDefault : function(){
    var obj = this.getSelectedItem();
    for(var i=0; i < this.servers.length; i++)
      if(this.servers[i].user == obj.server.user &&
          this.servers[i].url == obj.server.url)
        this.servers[i].default = true;
      else
        this.servers[i].default = false;

    this.listServers();
  },

  doSetButtonStatus : function(){
    var list = document.getElementById('options-list');
    var btnModify     = document.getElementById('button-modify');
	  var btnAdd        = document.getElementById('button-add');
	  var btnDelete     = document.getElementById('button-delete');
	  var btnDefault    = document.getElementById('button-default');
	  btnModify.setAttribute('disabled', true);
	  btnDelete.setAttribute('disabled', true);
	  btnDefault.setAttribute('disabled', true);
    if(list.selectedCount > 0){
      btnModify.removeAttribute('disabled');
      btnDelete.removeAttribute('disabled');
      if(!list.selectedItem.firstChild.hasAttribute('image'))
        btnDefault.removeAttribute('disabled');
    }
  }
}

window.addEventListener("load", function() {
  lasuli.setupLogging();
  lasuli.options.register();
}, false);

window.addEventListener("unload", function() {
  lasuli.options.unregister();
}, false);