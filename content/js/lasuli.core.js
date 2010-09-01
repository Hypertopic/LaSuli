include("resource://lasuli/modules/Observers.js");
include("resource://lasuli/modules/Preferences.js");

include("resource://lasuli/modules/HypertopicMapV2.js");

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
    HypertopicMapV2.baseUrl   = Preferences.get("extensions.lasuli.baseUrl", lasuli._baseUrl);
    HypertopicMapV2.user      = Preferences.get("extensions.lasuli.user", lasuli._username);
    HypertopicMapV2.pass      = Preferences.get("extensions.lasuli.pass", lasuli._password);
    logger.debug("BaseUrl:" + HypertopicMapV2.baseUrl);
    logger.debug("Username:" + HypertopicMapV2.user);
    logger.debug("Password:" + HypertopicMapV2.pass);
    HypertopicMapV2.init();
    return true;
  },
  
  //Auto register all observers
  register: function()
  {
    for(var func in this)
      if(func.substr(0, 6) == "action")
        Observers.add("lasuli.core." + func, lasuli.core[func], lasuli.core);
  },
  unregister: function()
  {
    for(var func in this)
      if(func.substr(0, 6) == "action")
        Observers.remove("lasuli.core." + func, lasuli.core[func], lasuli.core);
  },
  
  actionPrefChange : function()
  {
    var logger = Log4Moz.repository.getLogger("lasuli.core.actionPrefChange");
    logger.level = Log4Moz.Level["Debug"];
    if(lasuli.core.isSidebarOpen())
    {
      logger.debug("sidebar reload");
      document.getElementById("sidebar").contentWindow.location.reload();
    }
    //reInitial HypertopicMapV2
    lasuli.core.loadSetting();
  },
  
  actionListViewpoints: function()
  {
    var viewpoints = HypertopicMapV2.listViewpoints();
    //Notify lasuli.ui to show the viewpoints
    Observers.notify("lasuli.ui.showViewpoints", viewpoints);
  },
  
  actionCreateViewpoint : function(viewpointName)
  {
    var logger = Log4Moz.repository.getLogger("lasuli.core.actionCreateViewpoint");
    logger.debug("Name:" + subject);
    HypertopicMapV2.createViewpoint(viewpointName);
    //reload the viewpoints
    this.actionListViewpoints();
  },
  
  actionDestroyViewpoint : function(viewpointID)
  {
    var logger = Log4Moz.repository.getLogger("lasuli.core.actionDestroyViewpoint");
    HypertopicMapV2.destroyViewpoint(viewpointID);
    this.actionListViewpoints();
  },
  
  actionCreateAttribute : function(attribute){
    var logger = Log4Moz.repository.getLogger("lasuli.core.actionCreateAttribute");
    logger.debug(attribute);
    var result = HypertopicMapV2.describeItem(this.itemID, attribute.name, attribute.value);
    logger.debug(result);
    var attributes = HypertopicMapV2.listItemDescriptions(this.itemID);
    Observers.notify("lasuli.ui.showAttributes", attributes);
  },
  
  actionDestroyAttribute : function(attribute){
    var logger = Log4Moz.repository.getLogger("lasuli.core.actionDestroyAttribute");
    logger.debug(attribute);
    var result = HypertopicMapV2.undescribeItem(this.itemID, attribute.name, attribute.value);
    logger.debug(result);
    var attributes = HypertopicMapV2.listItemDescriptions(this.itemID);
    Observers.notify("lasuli.ui.showAttributes", attributes);
  },
  
  actionLoadDocument : function(url){
    var logger = Log4Moz.repository.getLogger("lasuli.core.actionLoadDocument");
    logger.debug("Browsing web page url:" + url);
    var arg = {};
    try{
      this.itemID = null;
      this.corpusID = null;
      var result = HypertopicMapV2.getResources(url);
      //logger.debug(result);
      this.itemID = result[url].item[0].id;
      this.corpusID = result[url].item[0].corpus;
      
      //logger.debug("Item ID:" + itemID);
      //logger.debug("Corpus ID:" + corpusID);
      
      var corpus = HypertopicMapV2.getCorpus(this.corpusID);
      Observers.notify("lasuli.ui.showUsers", corpus.user);
      Observers.notify("lasuli.ui.showItemName", corpus.name[0]);
      arg.corpus_name = corpus.name[0];
      arg.users = corpus.user;
      arg.attributes = HypertopicMapV2.listItemDescriptions(this.itemID);
      //logger.debug(corpus);
      //TODO value is array
      Observers.notify("lasuli.ui.showAttributes", arg.attributes);
      var item = HypertopicMapV2.getItem(this.corpusID, this.itemID);
      //logger.debug("==================item =========");
      //logger.debug(item);
      
      var topics = item.topic;
      for(var k in item)
        if("coordinates" in item[k])
          if(item[k].topic)
            topics = topics.concat(item[k].topic);
      //logger.debug(topics);
      arg.topics = {};
      topics.forEach(function(topic, index, topics){
        var result = HypertopicMapV2.getTopic(topic.viewpoint, topic.id);
        //logger.debug(result);
        result.viewpoint = topic.viewpoint;
        result.id = topic.id;
        if(result.highlight)
          delete result.highlight;
        if(result.broader)
          delete result.broader;
        if(result.narrower)
          delete result.narrower;
          
        if(!this.topics[result.name])
          this.topics[result.name] = new Array();
        this.topics[result.name].push(result);
      },arg);
      Observers.notify("lasuli.ui.showTopics", arg.topics);
    }catch(e)
    {
      logger.error(e);
    }
    
  }
}

var lasuliPrefObserver = {
  register: function() {
    this.logger = Log4Moz.repository.getLogger("LaSuli.Core.lasuliPrefObserver");
    this.logger.level = Log4Moz.Level["Debug"];
    var prefService = Cc["@mozilla.org/preferences-service;1"]
                                .getService(Ci.nsIPrefService);
    this._branch = prefService.getBranch("extensions.lasuli.");
    this._branch.QueryInterface(Components.interfaces.nsIPrefBranch2);
    this._branch.addObserver("", this, false);
    this.logger.debug('register preference observer');
  },

  unregister: function() {
    if (!this._branch) return;
    this._branch.removeObserver("", this);
    this.logger.debug('unregister preference observer');
  },

  observe: function(aSubject, aTopic, aData) {
    if(aTopic != "nsPref:changed") return;
    this.logger.debug("extensions.lasuli." + aData + " changed!");
    lasuli.core.actionPrefChange();
  }
}

window.addEventListener("load", function() {
  lasuli.setupLogging();
  
  lasuliPrefObserver.register();
  lasuli.core.register();
  
  lasuli.core.loadSetting();
}, false);

window.addEventListener("unload", function() {
  lasuliPrefObserver.unregister();
  lasuli.core.unregister();
}, false);