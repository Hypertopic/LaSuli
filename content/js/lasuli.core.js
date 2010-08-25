Cu.import("resource://lasuli/modules/Observers.js");
Cu.import("resource://lasuli/modules/Preferences.js");

lasuli.core = {
  _baseUrl: 'http://127.0.0.1', //TODO: default server uri
  _username: 'user@hypertopic.org',
  _password: 'no-need',
  
  loadSetting : function()
  {
    var logger = lasuli.Log4Moz.repository.getLogger("LaSuli.Core.loadSetting");
    logger.level = lasuli.Log4Moz.Level["Debug"];
    this._baseUrl   = Preferences.get("extensions.lasuli.baseUrl", this._baseUrl);
    this._username  = Preferences.get("extensions.lasuli.user", this._username);
    this._password  = Preferences.get("extensions.lasuli.pass", this._password);
    logger.info("BaseUrl:" + this._baseUrl);
    logger.info("Username:" + this._username);
    logger.info("Password:" + this._password);
    return true;
  }
}

var lasuliPrefObserver = {
  register: function() {
    this.logger = lasuli.Log4Moz.repository.getLogger("LaSuli.Core.lasuliPrefObserver");
    this.logger.level = lasuli.Log4Moz.Level["Debug"];
    var prefService = Cc["@mozilla.org/preferences-service;1"]
                                .getService(Ci.nsIPrefService);
    this._branch = prefService.getBranch("extensions.lasuli.");
    this._branch.QueryInterface(Components.interfaces.nsIPrefBranch2);
    this._branch.addObserver("", this, false);
    this.logger.info('register');
  },

  unregister: function() {
    if (!this._branch) return;
    this._branch.removeObserver("", this);
    this.logger.info('unregister');
  },

  observe: function(aSubject, aTopic, aData) {
    if(aTopic != "nsPref:changed") return;
    this.logger.warn("extensions.lasuli." + aData + " changed!");
    self.location.reload();
  }
}

$(function(){
  lasuliPrefObserver.register();
  setupLogging();
  lasuli.core.loadSetting();
});

$(window).bind("unload", function(){
  lasuliPrefObserver.unregister();
});