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
  loadSetting : function(){
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
  register: function(){
    var logger = Log4Moz.repository.getLogger("lasuli.core.register");
    //logger.warn("start to register");
    for(var func in this)
      if(func.substr(0, 6) == "action")
      {
        //logger.warn(func);
        Observers.add("lasuli.core." + func, lasuli.core[func], lasuli.core);
      }
  },
  unregister: function(){
    for(var func in this)
      if(func.substr(0, 6) == "action")
        Observers.remove("lasuli.core." + func, lasuli.core[func], lasuli.core);
  },
  
  domWindowLoaded : function(){
    var logger = Log4Moz.repository.getLogger("lasuli.core.domWindowLoaded");
    logger.info("load");
  },
  
  getMyCorpusID : function(){
    var logger = Log4Moz.repository.getLogger("lasuli.core.getCorpusID");
    var corpora;
    try{
      corpora = HypertopicMapV2.listCorpora(HypertopicMapV2.user);
    }catch(e){
      Observers.notify("lasuli.ui.doShowMessage", {"title": _("Error"), "content": _('couchdb.inaccessible', [HypertopicMapV2.baseUrl])});
      logger.fatal("CouchDB is not accessible!");
		  return false;
		}
    logger.info(corpora);
    if(!corpora)
      return this.createMyCorpus();
    else
    {
      for(var i=0, corpus; corpus = corpora[i]; i++)
        if(corpus.name == _("default.corpus.name", [HypertopicMapV2.user]))
        {
          this.myCorpusID = corpus.id;
          return true;
        }
      return this.createMyCorpus();
    }
  },
  
  createMyCorpus : function(){
    var logger = Log4Moz.repository.getLogger("lasuli.core.createCorpus");
    var corpusID = HypertopicMapV2.createCorpus(_("default.corpus.name", [HypertopicMapV2.user]), HypertopicMapV2.user);
    logger.debug(corpusID);
    if(!corpusID)
    {
		  Observers.notify("lasuli.ui.doShowMessage", {"title": _("Warning"), "content": _('create.corpus.warning', [HypertopicMapV2.user])});
		  return false;
		}
    this.myCorpusID = corpusID;
    return true;
  },
  
  actionPrefChange : function(){
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
  
  actionListViewpoints: function(){
    var logger = Log4Moz.repository.getLogger("lasuli.core.actionLoadDocument");
    var viewpoints = HypertopicMapV2.listViewpoints();
    logger.debug(viewpoints);
    //Notify lasuli.ui to show the viewpoints
    Observers.notify("lasuli.ui.doShowViewpoints", viewpoints);
  },
  
  actionCreateViewpoint : function(viewpointName){
    var logger = Log4Moz.repository.getLogger("lasuli.core.actionCreateViewpoint");
    logger.debug("Name:" + viewpointName);
    var result = HypertopicMapV2.createViewpoint(viewpointName);
    logger.debug(result);
    //reload the viewpoints
    this.actionListViewpoints();
  },
  
  actionDestroyViewpoint : function(viewpointID){
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
    Observers.notify("lasuli.ui.doShowAttributes", attributes);
  },
  
  actionDestroyAttribute : function(attribute){
    var logger = Log4Moz.repository.getLogger("lasuli.core.actionDestroyAttribute");
    logger.debug(attribute);
    var result = HypertopicMapV2.undescribeItem(this.itemID, attribute.name, attribute.value);
    logger.debug(result);
    var attributes = HypertopicMapV2.listItemDescriptions(this.itemID);
    Observers.notify("lasuli.ui.doShowAttributes", attributes);
  },
  
  actionLoadDocument : function(url){
    var logger = Log4Moz.repository.getLogger("lasuli.core.actionLoadDocument");
    logger.debug("Browsing web page url:" + url);
    if(this.myCorpusID == null)
      if(!this.getMyCorpusID()) return false;
    
    logger.info(this.myCorpusID);
    // all items used for this resources
    this.items = {};
      
    // document item
    this.corpusID = null;
    this.itemID = null;
    try{
      var result = HypertopicMapV2.getResources(url);
      logger.debug(result);
      for(var i=0, row; row = result[url].item[i]; i++)
      {
        if(this.itemID == null)
        {
          this.itemID = row.id;
          this.corpusID = row.corpus;
        }
        logger.debug(row);
        if(!this.items[row.corpus])
          this.items[row.corpus] = new Array();
        this.items[row.corpus].push(row.id);
      }
      logger.debug(this.items);
    }catch(e){
      logger.fatal("error when try to get the information on resource : " + url);
      logger.fatal(e);
    }
    
    try{  
      // Get the document name and attributes.
      var item = HypertopicMapV2.getItem(this.corpusID, this.itemID);
      
      var corpus = HypertopicMapV2.getCorpus(this.corpusID);
      Observers.notify("lasuli.ui.doShowUsers", corpus.user);
      Observers.notify("lasuli.ui.doShowItemName", corpus.name[0]);
      arg.corpus_name = corpus.name[0];
      arg.users = corpus.user;
      arg.attributes = HypertopicMapV2.listItemDescriptions(this.itemID);
      //logger.debug(corpus);
      //TODO value is array
      Observers.notify("lasuli.ui.doShowAttributes", arg.attributes);
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
      this.topics = arg.topics;
      //logger.error(this.topics);
      Observers.notify("lasuli.ui.doShowTopics", arg.topics);
    }catch(e)
    {
      logger.error(e);
    }
    
  },
  
  actionOpenViewpointByTopicName : function(topicName) {
    var logger = Log4Moz.repository.getLogger("lasuli.core.actionOpenViewpointByTopicName");
    //logger.debug("topicName: " + topicName);
    if(!this.topics) return false;
    var viewpointIDs = new Array();
    var strTopics = JSON.stringify(this.topics);
    while( result = /\"viewpoint\":\s?\"([a-zA-z0-9]+)\"/ig.exec(strTopics))
        if(typeof(result[1]) != "undefined" && viewpointIDs.indexOf(result[1]) == -1) viewpointIDs.push(result[1]);
    
    logger.debug(viewpointIDs);
    var viewpoints = new Array();
    for(var i=0, viewpointID; viewpointID = viewpointIDs[i]; i++)
    {
      var viewpoint = HypertopicMapV2.getViewpoint(viewpointID);
      if(viewpoint) viewpoints.push(viewpoint);
    }
    Observers.notify("lasuli.ui.doShowViewpointPanels", viewpoints);
  },
  
  actionOpenViewpointByUser : function(user){
    var logger = Log4Moz.repository.getLogger("lasuli.core.actionOpenViewpointByUser");
    //logger.debug("user: " + user);
    var corpora = HypertopicMapV2.listCorpora(user);
    //logger.debug(corpora);
    if(!corpora) return false;
    
    var viewpointIDs = new Array();
    for(var i=0, corpus; corpus = corpora[i];i++)
    {
      corpus = HypertopicMapV2.getCorpus(corpus.id);
      var strCorpus = JSON.stringify(corpus);
      while( result = /\"viewpoint\":\s?\"([a-zA-z0-9]+)\"/ig.exec(strCorpus))
        if(typeof(result[1]) != "undefined" && viewpointIDs.indexOf(result[1]) == -1) viewpointIDs.push(result[1]);
    }
    logger.debug(viewpointIDs);
    var viewpoints = new Array();
    for(var i=0, viewpointID; viewpointID = viewpointIDs[i]; i++)
    {
      var viewpoint = HypertopicMapV2.getViewpoint(viewpointID);
      if(viewpoint) viewpoints.push(viewpoint);
    }
    Observers.notify("lasuli.ui.doShowViewpointPanels", viewpoints);
  },
  
  actionLoadKeywords : function(viewpoint){
    var logger = Log4Moz.repository.getLogger("lasuli.core.actionLoadKeywords");
    logger.debug(this.corpusID);
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