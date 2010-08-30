include("resource://lasuli/modules/Observers.js");
include("resource://lasuli/modules/Preferences.js");

lasuli.core = {
  
  //Open lasuli sidebar
  openSideBar : function(){
		if(!lasuli.core.isSidebarOpen()){
   		toggleSidebar('viewLaSuliSidebar', true);
  	}
	},
  
  //Get sidebar status
	isSidebarOpen : function(){
		return (document.getElementById("viewLaSuliSidebar").getAttribute("checked") == "true");
	},
	
	//Load setting from preferences
  loadSetting : function()
  {
    var logger = Log4Moz.repository.getLogger("lasuli.core.loadSetting");
    logger.level = Log4Moz.Level["Debug"];
    lasuli._baseUrl   = Preferences.get("extensions.lasuli.baseUrl", lasuli._baseUrl);
    lasuli._username  = Preferences.get("extensions.lasuli.user", lasuli._username);
    lasuli._password  = Preferences.get("extensions.lasuli.pass", lasuli._password);
    logger.info("BaseUrl:" + lasuli._baseUrl);
    logger.info("Username:" + lasuli._username);
    logger.info("Password:" + lasuli._password);
    //lasuli._map = new HypertopicMapV2(lasuli._baseUrl);
    return true;
  },
  
  //Register all observers
  registerObservers: function()
  {
    Observers.add("nsPref:changed", lasuli.core.actionPrefChange, lasuli.core);
    Observers.add("LaSuli:actionLoadViewpoint", lasuli.core.actionLoadViewpoint, lasuli.core);
  },
  
  actionPrefChange : function(subject, data)
  {
    var logger = Log4Moz.repository.getLogger("lasuli.core.actionPrefChange");
    this.logger.warn("extensions.lasuli." + subject + " changed!");
    if(lasuli.core.isSidebarOpen())
    {
      document.getElementById("viewLaSuliSidebar").location.reload();
    }
  },
  
  actionLoadViewpoint: function(subject, data)
  {
    alert(subject);
  }
}


window.addEventListener("load", function() {
  lasuli.setupLogging();
  lasuli.core.loadSetting();
  lasuli.core.registerObservers();
}, false);