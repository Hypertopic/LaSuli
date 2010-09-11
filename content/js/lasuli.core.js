include("resource://lasuli/modules/Observers.js");
include("resource://lasuli/modules/Preferences.js");
include("resource://lasuli/modules/log4moz.js");

include("resource://lasuli/modules/HypertopicMap.js");

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
    HypertopicMap.baseUrl   = Preferences.get("extensions.lasuli.baseUrl", lasuli._baseUrl);
    HypertopicMap.user      = Preferences.get("extensions.lasuli.user", lasuli._username);
    HypertopicMap.pass      = Preferences.get("extensions.lasuli.pass", lasuli._password);
    //logger.debug("BaseUrl:" + HypertopicMap.baseUrl);
    //logger.debug("Username:" + HypertopicMap.user);
    //logger.debug("Password:" + HypertopicMap.pass);
    HypertopicMap.init();
    return true;
  },

  //Auto register all observers
  register: function(){
    var logger = Log4Moz.repository.getLogger("lasuli.core.register");
    //logger.warn("start to register");
    for(var func in this)
      if(func.substr(0, 2) == "do")
      {
        //logger.warn(func);
        Observers.add("lasuli.core." + func, lasuli.core[func], lasuli.core);
      }
  },
  unregister: function(){
    for(var func in this)
      if(func.substr(0, 2) == "do")
        Observers.remove("lasuli.core." + func, lasuli.core[func], lasuli.core);
  },


  doPrefChange : function(){
    var logger = Log4Moz.repository.getLogger("lasuli.core.doPrefChange");
    logger.level = Log4Moz.Level["Debug"];
    //reInitial HypertopicMap
    lasuli.core.loadSetting();
    if(lasuli.core.isSidebarOpen())
    {
      logger.debug("sidebar reload");
      document.getElementById("sidebar").contentWindow.location.reload();
    }
  },

  // When tabWatcher find a new location is input, trigger this function
  doLocationChange: function(url){
    var logger = Log4Moz.repository.getLogger("lasuli.core.doLocationChange");
    //Check the sidebar status
    logger.debug(url);
    //If the url is unchanged, do nothing. (e.g. switch between two tabs on the same url)
    if(url == lasuli.hypertopic.currentUrl) return false;
      lasuli.hypertopic.currentUrl = url;
    //If the sidebar is not opened yet, do nothing.
    if(!lasuli.core.isSidebarOpen()) return false;

    logger.debug("doCloseViewpointPanel and doLoadDocument on url:" + lasuli.hypertopic.currentUrl);

    //If opened an empty page, block the lasuli
    if(!url || url == "about:blank")
    {
      dispatch("lasuli.ui.doBlockUI", null);
      return false;
    }
    dispatch("lasuli.ui.doUnBlockUI", null);

    dispatch("lasuli.ui.doCloseViewpointPanel", null);
    dispatch("lasuli.core.doLoadDocument", null);
  },

  doLoadDocument : function(){
    var logger = Log4Moz.repository.getLogger("lasuli.core.doLoadDocument");
    dispatch("lasuli.ui.doClearDocumentPanel", null);

    dispatch("lasuli.ui.doShowItemName", lasuli.hypertopic.itemName);
    dispatch("lasuli.ui.doShowAttributes", lasuli.hypertopic.attributes);
    dispatch("lasuli.ui.doShowUsers", lasuli.hypertopic.users);
    dispatch("lasuli.ui.doShowTagCloud", lasuli.hypertopic.tags);
    // Highlight all fragments
    dispatch("lasuli.highlighter.doHighlight", lasuli.hypertopic.allFragments);
  },

  doListViewpoints: function(){
    var logger = Log4Moz.repository.getLogger("lasuli.core.doListViewpoints");
    //Notify lasuli.ui to show the viewpoints
    dispatch("lasuli.ui.doShowViewpoints", lasuli.hypertopic.viewpoints);
  },

  doCreateViewpoint : function(viewpointName){
    var logger = Log4Moz.repository.getLogger("lasuli.core.doCreateViewpoint");
    logger.debug("Name:" + viewpointName);

    var result = HypertopicMap.createViewpoint(viewpointName);
    lasuli.hypertopic.viewpoints = null;
    logger.debug(result);
    //reload the viewpoints
    this.doListViewpoints();
  },

  doDestroyViewpoint : function(viewpointID){
    var logger = Log4Moz.repository.getLogger("lasuli.core.doDestroyViewpoint");
    HypertopicMap.destroyViewpoint(viewpointID);
    lasuli.hypertopic.viewpoints = null;
    this.doListViewpoints();
    dispatch("lasuli.ui.doCloseViewpointPanel", viewpointID);
  },


  doRenameItem : function(arg){
    var logger = Log4Moz.repository.getLogger("lasuli.core.doRenameItem");
    logger.debug(arg);
    try{
      lasuli.hypertopic.itemName = arg.newName;
      dispatch('lasuli.ui.doShowItemName', arg.newName);
    }catch(e){
      //TODO Show error message
      logger.fatal('failed to rename item');
      dispatch('lasuli.ui.doShowItemName', arg.name);
    }
  },

  doReloadTagCloud : function(){
    lasuli.hypertopic.tags = null;
    dispatch('lasuli.ui.doShowTagCloud', lasuli.hypertopic.tags);
  },

  doCreateAttribute : function(attribute){
    var logger = Log4Moz.repository.getLogger("lasuli.core.doCreateAttribute");
    lasuli.hypertopic.createAttribute(attribute);
    dispatch("lasuli.ui.doShowAttributes", lasuli.hypertopic.attributes);
  },

  doDestroyAttribute : function(attribute){
    var logger = Log4Moz.repository.getLogger("lasuli.core.doDestroyAttribute");
    lasuli.hypertopic.destroyAttribute(attribute);
    dispatch("lasuli.ui.doShowAttributes", lasuli.hypertopic.attributes);
  },

  doOpenViewpointByTopicName : function(topicName) {
    var logger = Log4Moz.repository.getLogger("lasuli.core.doOpenViewpointByTopicName");
    logger.debug("topicName: " + topicName);
    if(!lasuli.hypertopic.tags || !lasuli.hypertopic.tags[topicName]) return false;

    var topics = lasuli.hypertopic.tags[topicName].topics;
    var viewpoints = new Array();
    for(var i=0, topic; topic = topics[i]; i++)
      viewpoints.push({"id": topic.viewpointID, "name": lasuli.hypertopic.getViewpointName(topic.viewpointID)});
    logger.debug(viewpoints);
    dispatch("lasuli.ui.doShowViewpointPanels", viewpoints);
  },

  doOpenViewpointByUser : function(user){
    var logger = Log4Moz.repository.getLogger("lasuli.core.doOpenViewpointByUser");
    var viewpoints = new Array();
    var viewpointIDs = lasuli.hypertopic.getViewpointIDsByUser(user);
    for(var i=0, viewpointID; viewpointID = viewpointIDs[i]; i++)
      viewpoints.push({"id": viewpointID, "name": lasuli.hypertopic.getViewpointName(viewpointID)});
    logger.debug(viewpoints);
    //TODO filter not related viewpoints
    dispatch("lasuli.ui.doShowViewpointPanels", viewpoints);
  },

  doLoadKeywords : function(viewpointID){
    var logger = Log4Moz.repository.getLogger("lasuli.core.doLoadKeywords");
    logger.debug(viewpointID);
    lasuli.hypertopic.viewpointID = viewpointID;
    dispatch("lasuli.ui.doShowKeywords", lasuli.hypertopic.keywords);
  },

  doCreateKeyword : function(keyword) {
    var logger = Log4Moz.repository.getLogger("lasuli.core.doCreateKeyword");
    logger.debug(keyword);

    //Clear the tags cache
    var result = lasuli.hypertopic.createKeyword(keyword.viewpointID, keyword.name);
    if(!result) return false;

    logger.debug(result);
    dispatch("lasuli.ui.doShowKeywords", lasuli.hypertopic.keywords);
  },

  doRemoveKeyword : function(keyword) {
    var logger = Log4Moz.repository.getLogger("lasuli.core.doRemoveKeyword");
    logger.debug(keyword);
    var result = lasuli.hypertopic.destroyKeyword(keyword);
    logger.debug(result);
    if(!result)
      dispatch("lasuli.ui.doShowMessage", {"title": _("Error"), "content": _('tagItem.delete.failed', [tag.name])});
    else
    {
      dispatch("lasuli.ui.doRemoveKeyword", keyword);
    }
  },

  doRenameKeyword : function(keyword){
    var logger = Log4Moz.repository.getLogger("lasuli.core.doRenameKeyword");
    var result = false;
    if(keyword.newName == keyword.name)
    {
      dispatch("lasuli.ui.doRestoreKeyword",keyword);
      return false;
    }
    var result = lasuli.hypertopic.renameKeyword(keyword);

    if(result){
      keyword.name = keyword.newName;
      dispatch("lasuli.ui.doRestoreKeyword",keyword);
    }
    else{
      dispatch("lasuli.ui.doRestoreKeyword",keyword);
      dispatch("lasuli.ui.doShowMessage", {"title": _("Error"), "content": _('tagItem.rename.failed', [keyword.name,keyword.newName])});
    }
  },

  doCreateAnalysis: function(viewpointID){
    var logger = Log4Moz.repository.getLogger("lasuli.core.doCreateAnalysis");
    logger.debug(viewpointID);
    var topic = lasuli.hypertopic.createAnalysis(viewpointID);
    if(topic){
      dispatch("lasuli.ui.doCreateAnalysis", topic );
      dispatch("lasuli.contextmenu.doAddMenuItem", topic );
    }
  },

  doDestroyAnalysis : function(arg){
    var logger = Log4Moz.repository.getLogger("lasuli.core.doDestroyAnalysis");
    var viewpointID = arg.viewpointID;
    var topicID = arg.topicID;
    var result = lasuli.hypertopic.destroyAnalysis(arg.viewpointID, arg.topicID, arg.name);
    if(result){
      dispatch("lasuli.ui.doDestroyAnalysis", arg );
      dispatch("lasuli.contextmenu.doRemoveMenuItem", topicID );
    }
    else
      dispatch("lasuli.ui.doShowMessage", {"title": _("Error"), "content": _('analysis.delete.failed', [arg.name])});
  },

  doRenameAnalysis : function(arg){
    var logger = Log4Moz.repository.getLogger("lasuli.core.doRenameAnalysis");
    logger.debug(arg);
    var result =lasuli.hypertopic.renameAnalysis(arg.viewpointID, arg.topicID, arg.name, arg.newName);
    if(result){
      dispatch("lasuli.contextmenu.doUpdateMenuItem", {"viewpointID": arg.viewpointID, "topicID": arg.topicID, "name": arg.newName});
      arg.name = arg.newName;
    }

    dispatch("lasuli.ui.doRestoreAnalysis", arg );
  },

  doLoadFragments : function(viewpointID){
    var logger = Log4Moz.repository.getLogger("lasuli.core.doLoadFragments");
    lasuli.hypertopic.viewpointID = viewpointID;
    dispatch("lasuli.ui.doShowFragments", {"topics": lasuli.hypertopic.topics, "fragments": lasuli.hypertopic.fragments} );
    //Enable the mozilla context menu
    dispatch('lasuli.contextmenu.doShow', lasuli.hypertopic.topics);
  },

  doCreateFragment : function(fragment){
    var logger = Log4Moz.repository.getLogger("lasuli.core.doCreateFragment");
    logger.debug(fragment);
    try{
      var result = lasuli.hypertopic.createFragment(fragment.startPos, fragment.endPos, fragment.text, fragment.viewpointID, fragment.topicID);
      var topics = {}
      if(result && result.topic)
      {
        topics[result.topic.topicID] = result.topic;
        fragment.topicID = result.topic.topicID;
      }

      fragments = {};
      if(result && result.fragmentID){
        fragment.fragmentID = result.fragmentID;
        fragments[result.fragmentID] = fragment;
        dispatch("lasuli.ui.doShowFragments", {"topics": topics, "fragments": fragments, "scroll": true});
      }
    }catch(e){
      logger.fatal(e);
    }
  },

  doDestroyFragment : function(fragment){
    var logger = Log4Moz.repository.getLogger("lasuli.core.doDestroyFragment");
    logger.debug(fragment);
    var result = lasuli.hypertopic.destroyFragment(fragment.itemID, fragment.fragmentID);
    logger.debug(result);
    if(result)
      dispatch("lasuli.ui.doRemoveFragment", fragment.fragmentID );
  },

  doMoveFragment : function(arg){
    var logger = Log4Moz.repository.getLogger("lasuli.core.doMoveFragment");
    logger.debug(arg);

    var result = lasuli.hypertopic.moveFragment(arg.itemID, arg.fragmentID, arg.viewpointID, arg.targetTopicID);
    logger.debug(result);
    if(result){
      dispatch("lasuli.ui.doDropFragmentAccepted", arg );
    }
    else{
      dispatch("lasuli.ui.doShowMessage", {"title": _("Error"), "content": _('analysis.fragment.move.failed')});
      dispatch("lasuli.ui.doDropFragmentDenied", arg );
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
    //this.logger.debug('register preference observer');
  },

  unregister: function() {
    if (!this._branch) return;
    this._branch.removeObserver("", this);
    //this.logger.debug('unregister preference observer');
  },

  observe: function(aSubject, aTopic, aData) {
    if(aTopic != "nsPref:changed") return;
    this.logger.debug("extensions.lasuli." + aData + " changed!");
    lasuli.core.doPrefChange();
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