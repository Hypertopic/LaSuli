include("resource://lasuli/modules/Preferences.js");

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

	  this.servers = new Array({'url': 'http://hypertopic.couchone.com/argos/', 'user':'chao@zhou.fr', 'pass':'', 'default': true},
	                          {'url': 'http://lasuli.couchone.com/argos/', 'user':'chao@hypertopic.org', 'pass':''},
	                          {'url': 'http://lasuli.couchone.com/lasuli/', 'user':'user@hypertopic.org', 'pass':''});
	  Preferences.set("extensions.lasuli.setting",JSON.stringify(this.servers));
    //Load setting from preferences
    this.servers = Preferences.get("extensions.lasuli.setting",JSON.stringify(new Array()));
    if(typeof(this.servers) == "string") this.servers = JSON.parse(this.servers);
    var lists = document.getElementById('options-list');
    //Display settings
    for(var i=0, server; server = this.servers[i]; i++)
    {
      var listitem = document.createElement('listitem');
      var listcell = document.createElement('listcell');
      if(server.default === true)
        listcell.setAttribute('label', 'D');
      else
        listcell.setAttribute('label', ' ');
      listitem.appendChild(listcell);

      listcell = document.createElement('listcell');
      listcell.setAttribute('label', server.user);
      listitem.appendChild(listcell);

      listcell = document.createElement('listcell');
      listcell.setAttribute('label', server.url);
      listitem.appendChild(listcell);

      lists.appendChild(listitem);
    }
  },

  okay : function(){
    var logger = Log4Moz.repository.getLogger("lasuli.options.okay");
    Preferences.set("extensions.lasuli.setting",JSON.stringify(this.servers));
    return true;
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
    window.open('setting.xul');
  }
}

window.addEventListener("load", function() {
  lasuli.setupLogging();
  lasuli.options.register();
}, false);

window.addEventListener("unload", function() {
  lasuli.options.unregister();
}, false);