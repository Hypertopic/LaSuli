Cu.import("resource://lasuli/modules/Observers.js");
Cu.import("resource://lasuli/modules/Preferences.js");

lasuli.core = {
  
  loadSetting : function()
  {
    var logger = lasuli.Log4Moz.repository.getLogger("LaSuli.Core.loadSetting");
    logger.level = lasuli.Log4Moz.Level["Debug"];
    lasuli._baseUrl   = Preferences.get("extensions.lasuli.baseUrl", lasuli._baseUrl);
    lasuli._username  = Preferences.get("extensions.lasuli.user", lasuli._username);
    lasuli._password  = Preferences.get("extensions.lasuli.pass", lasuli._password);
    logger.info("BaseUrl:" + lasuli._baseUrl);
    logger.info("Username:" + lasuli._username);
    logger.info("Password:" + lasuli._password);
    lasuli._map = new HypertopicMapV2(lasuli._baseUrl);
    return true;
  },
  
  listViewpoints: function()
  {
    
  }
}

// Detect the preference changes, when the setting is changed reload the sidebar.
var lasuliPrefObserver = {
  register: function() {
    this.logger = lasuli.Log4Moz.repository.getLogger("LaSuli.Core.lasuliPrefObserver");
    this.logger.level = lasuli.Log4Moz.Level["Debug"];
    var prefService = Cc["@mozilla.org/preferences-service;1"]
                                .getService(Ci.nsIPrefService);
    this._branch = prefService.getBranch("extensions.lasuli.");
    this._branch.QueryInterface(Components.interfaces.nsIPrefBranch2);
    this._branch.addObserver("", this, false);
    this.logger.info('register preference observer');
  },

  unregister: function() {
    if (!this._branch) return;
    this._branch.removeObserver("", this);
    this.logger.info('unregister preference observer');
  },

  observe: function(aSubject, aTopic, aData) {
    if(aTopic != "nsPref:changed") return;
    this.logger.warn("extensions.lasuli." + aData + " changed!");
    self.location.reload();
  }
}

$(function(){
  lasuli.setupLogging();
  lasuliPrefObserver.register();
  lasuli.core.loadSetting();
});

$(window).bind("unload", function(){
  lasuliPrefObserver.unregister();
});