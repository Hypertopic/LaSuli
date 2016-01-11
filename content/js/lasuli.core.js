include("resource://lasuli/modules/Observers.js");
include("resource://lasuli/modules/Preferences.js");
include("resource://lasuli/modules/HypertopicMap.js");
var tabs = require("sdk/tabs");

lasuli.core = {
  fragments : {},

  //Open lasuli sidebar
  openSideBar : function(){
		if(!lasuli.core.isSidebarOpen()){
   		toggleSidebar('viewLaSuliSidebar', true);
  	}
	},
  closeSideBar : function(){
    if(lasuli.core.isSidebarOpen())
   		toggleSidebar('viewLaSuliSidebar', false);
  },
  //Get sidebar status
	isSidebarOpen : function(){
		return (document.getElementById("viewLaSuliSidebar").getAttribute("checked") == "true");
	},

	//Load setting from preferences
  loadSetting : function(){
    console.time("lasuli.core.loadSetting");
    var prompts = Cc["@mozilla.org/embedcomp/prompt-service;1"]
                        .getService(Ci.nsIPromptService);
    var servers = Preferences.get("extensions.lasuli.setting", JSON.stringify(new Array()));
    if(typeof(servers) == "string")
      servers = JSON.parse(servers);
    HtServers = {};
    for(var i=0, server; server = servers[i]; i++)
    {
      var n = getUUID();
      if(server.default)
        n = "freecoding";
      HtServers[n] = new HtMap(server.url, server.user, server.pass);
      if(typeof(HtServers[n].serverType) != "string")
      {
        prompts.alert(window, _('Error'), _('options.error.servernotaccessible',[server.url]));
        dispatch("lasuli.ui.doOpenConfigPanel", '');
        return false;
      }
    }
    console.timeEnd("lasuli.core.loadSetting");
    return true;
  },

  //Auto register all observers
  register: function(){
    for(var func in this)
      if(func.substr(0, 2) == "do" && typeof(lasuli.core[func]) == "function")
        Observers.add("lasuli.core." + func, lasuli.core[func], lasuli.core);
  },
  unregister: function(){
    for(var func in this)
      if(func.substr(0, 2) == "do" && typeof(lasuli.core[func]) == "function")
        Observers.remove("lasuli.core." + func, lasuli.core[func], lasuli.core);
  },

  doClearFragmentsCache : function(){
    this.fragments = {};
  },

  doLoadDocument : function(){
    console.time("lasuli.core.doLoadDocument");
    lasuli.hypertopic.currentUrl = tabs.activeTab.url.split('#')[0];
    if(!lasuli.core.isSidebarOpen()) return false;
    dispatch("lasuli.ui.doShowItemName", lasuli.hypertopic.itemName);
    _p(20);
    dispatch("lasuli.ui.doShowAttributes", lasuli.hypertopic.attributes);
    _p(40);
    dispatch("lasuli.ui.doShowTagCloud", lasuli.hypertopic.docTags);
    _p(80);
    // Highlight all fragments
    var fragments = lasuli.hypertopic.docCoordinates;
    this.fragments[lasuli.hypertopic.currentUrl] = fragments;
    dispatch("lasuli.highlighter.doHighlight", {"fragments": fragments});
    Sync.sleep(1000);
    dispatch("lasuli.highlighter.doHighlightAnchor", null);
    _p(100);
    console.timeEnd("lasuli.core.doLoadDocument");
  },

  doListViewpoints: function(){
    console.time("lasuli.core.doListViewpoints");
    //Notify lasuli.ui to show the viewpoints
    dispatch("lasuli.ui.doShowViewpoints", lasuli.hypertopic.viewpoints);
    console.timeEnd("lasuli.core.doListViewpoints");
  },

  doCreateViewpoint : function(viewpointName){
    console.time("lasuli.core.doCreateViewpoint");
    _p(30);
    var result = lasuli.hypertopic.createViewpoint(viewpointName);
    _p(70);
    //reload the viewpoints
    if(result)
      this.doListViewpoints();
    else
      dispatch("lasuli.ui.doShowMessage", {"title": _("Error"), "content": _('create.viewpoint.error', viewpointName)});
    _p(100);
    console.timeEnd("lasuli.core.doCreateViewpoint");
  },

  doDestroyViewpoint : function(viewpointID){
    console.time("lasuli.core.doDestroyViewpoint");
    _p(30);
    if(lasuli.hypertopic.destroyViewpoint(viewpointID))
    {
      this.doListViewpoints();
      dispatch("lasuli.ui.doCloseViewpointPanel", viewpointID);
    }
    else
      dispatch("lasuli.ui.doShowMessage", {"title": _("Error"), "content": _('destroy.viewpoint.error', viewpointName)});
    _p(100);
    console.timeEnd("lasuli.core.doDestroyViewpoint");
  },

  doRenameItem : function(arg){
    console.time("lasuli.core.doRenameItem");
    _p(30);
    try{
      lasuli.hypertopic.itemName = arg.newName;
      _p(70);
      dispatch('lasuli.ui.doShowItemName', arg.newName);
    }catch(e){
      //TODO Show error message
      console.error('failed to rename item');
      dispatch('lasuli.ui.doShowItemName', arg.name);
    }
    _p(100);
    console.timeEnd("lasuli.core.doRenameItem");
  },

  doCreateAttribute : function(attribute){
    console.time("lasuli.core.doCreateAttribute");
    _p(30);
    lasuli.hypertopic.createAttribute(attribute);
    _p(70);
    dispatch("lasuli.ui.doShowAttributes", lasuli.hypertopic.attributes);
    _p(100);
    console.timeEnd("lasuli.core.doCreateAttribute");
  },

  doDestroyAttribute : function(attribute){
    console.time("lasuli.core.doDestroyAttribute");
    _p(50);
    lasuli.hypertopic.destroyAttribute(attribute);
    _p(90);
    dispatch("lasuli.ui.doShowAttributes", lasuli.hypertopic.attributes);
    _p(100);
    console.timeEnd("lasuli.core.doDestroyAttribute");
  },

  doOpenViewpointByTopicName : function(topicName) {
    console.time("lasuli.core.doOpenViewpointByTopicName");
    _p(30);
    if(!lasuli.hypertopic.docTags || !lasuli.hypertopic.docTags[topicName])
    {
      _p(100);
      return false;
    }
    _p(70);
    var viewpoints = lasuli.hypertopic.getViewpointsByTopicName(topicName);
    _p(90);
    dispatch("lasuli.ui.doShowViewpointPanels", viewpoints);
    _p(100);
    console.timeEnd("lasuli.core.doOpenViewpointByTopicName");
  },

  doLoadTopicTree : function(viewpointID){
    console.time("lasuli.core.doLoadTopicTree");
    lasuli.hypertopic.viewpointID = viewpointID;
    var tree = lasuli.hypertopic.topicTree;
    dispatch("lasuli.ui.doShowTopicTree", tree);
    console.timeEnd("lasuli.core.doLoadTopicTree");
  },
  doReloadTopicTree: function(viewpointID){
    console.time("lasuli.core.doReloadTopicTree");
    if(viewpointID) lasuli.hypertopic.viewpointID = viewpointID;
    dispatch("lasuli.ui.doReloadTopicTree", lasuli.hypertopic.topicTree);
    console.timeEnd("lasuli.core.doReloadTopicTree");
  },
  doCreateTopicTreeItem: function(arg){
    console.time("lasuli.core.doCreateTopicTreeItem");
    _p(30);
    var topic = lasuli.hypertopic.createAnalysis(arg.viewpointID, arg.topicID, _("no.name"));
    _p(60);
    if(topic)
    {
      dispatch("lasuli.ui.doCreateTopicTreeItem", {"viewpointID": arg.viewpointID, "topicID": topic.topicID, "sourceObj":arg.sourceObj});
      _p(70);
      //append to analysis
      dispatch("lasuli.ui.doCreateAnalysis", topic);
      _p(80);
      //add menu item to context menu
      dispatch("lasuli.contextmenu.doAddMenuItem", topic );
      _p(90);
    }
    else
      dispatch("lasuli.ui.doShowMessage", {"title": _("Error"), "content": _('topictree.create.topic.failed')});
    _p(100);
    console.timeEnd("lasuli.core.doCreateTopicTreeItem");
  },

  doDestroyTopicTreeItem: function(arg){
    console.time("lasuli.core.doDestroyTopicTreeItem");
    var topicID = arg.topicID;
    var viewpointID = arg.viewpointID;
    _p(30);
    if(arg.topicType && (arg.topicType == "analysis" || arg.topicType == "topic"))
    {
      var result = lasuli.hypertopic.destroyAnalysis(viewpointID, topicID);
      _p(50);
      if(result){
        //dispatch("lasuli.ui.doDestroyTopicTreeItem", arg );
        dispatch("lasuli.core.doReloadTopicTree", false );
        _p(70);
        dispatch("lasuli.ui.doDestroyAnalysis", arg );
        _p(80);
        dispatch("lasuli.contextmenu.doRemoveMenuItem", topicID );
        for(var i=0, fragmentID; fragmentID = result[i]; i++)
            dispatch("lasuli.highlighter.doRemoveFragment", fragmentID );
        _p(100);
      }
      else
        dispatch("lasuli.ui.doShowMessage", {"title": _("Error"), "content": _('topictree.topic.delete.failed', [arg.name])});
      _p(100);
      return;
    }
    if(arg.topicType && arg.topicType == "keyword")
    {
      var result = lasuli.hypertopic.destroyKeyword(arg, true);
      _p(50);
      if(result)
      {
        //dispatch("lasuli.ui.doDestroyTopicTreeItem", arg );
        dispatch("lasuli.core.doReloadTopicTree", false );
        _p(80);
        dispatch("lasuli.ui.doDestroyKeyword", arg);
        _p(100);
      }
      else
        dispatch("lasuli.ui.doShowMessage", {"title": _("Error"), "content": _('topictree.topic.delete.failed', [arg.name])});
      _p(100);
      return;
    }
    console.timeEnd("lasuli.core.doDestroyTopicTreeItem");
  },
  
  doMoveTopicTreeItem : function(arg){
    console.time("lasuli.core.doMoveTopicTreeItem");
    var topicID = arg.topicID;
    var viewpointID = arg.viewpointID;
    var broaderTopicID = arg.broaderTopicID;
    var data = arg.data;
    if(lasuli.hypertopic.moveTopic(viewpointID, topicID, broaderTopicID))
      dispatch("lasuli.ui.doRefreshTopicTree", data);
    else
      dispatch("lasuli.ui.doRollbackTopicTree", data);
    console.timeEnd("lasuli.core.doMoveTopicTreeItem");
  },
  doRenameTopicTreeItem : function(arg){
    console.time("lasuli.core.doRenameTopicTreeItem");
    var topicID = arg.topicID;
    var viewpointID = arg.viewpointID;

    _p(30);
    if(arg.topicType && arg.topicType == "viewpoint")
    {
      if(lasuli.hypertopic.renameViewpoint(viewpointID, arg.newName))
      {
        _p(60);
        arg.name = arg.newName;
        dispatch("lasuli.ui.doRenameViewpoint", viewpointID, arg.newName);
      }
      else
      {
        dispatch("lasuli.ui.doShowMessage", {"title": _("Error"), "content": _('topictree.viewpoint.rename.failed', [arg.name,arg.newName])});
      }
      dispatch("lasuli.ui.doRenameTopicTreeItem", arg);
      _p(100);
      return;
    }

    if(arg.topicType && (arg.topicType == "analysis" || arg.topicType == "topic"))
    {
      var result =lasuli.hypertopic.renameAnalysis(arg.viewpointID, arg.topicID, arg.name, arg.newName);
      _p(60);
      if(result){
        dispatch("lasuli.contextmenu.doUpdateMenuItem", {"viewpointID": arg.viewpointID, "topicID": arg.topicID, "name": arg.newName});
        arg.name = arg.newName;
        dispatch("lasuli.ui.doRenameAnalysis", arg );
        lasuli.hypertopic.tags = null;
      }
      else
      {
        dispatch("lasuli.ui.doShowMessage", {"title": _("Error"), "content": _('topictree.topic.rename.failed', [arg.name,arg.newName])});
      }
      dispatch("lasuli.ui.doRenameTopicTreeItem", arg);
      _p(100);
      return;
    }

    if(arg.topicType && arg.topicType == "keyword")
    {
      var result = lasuli.hypertopic.renameKeyword(arg);
      _p(60);
      if(result){
        lasuli.hypertopic.tags = null;
        arg.name = arg.newName;
        dispatch("lasuli.ui.doRestoreKeyword",arg);
      }
      else{
        dispatch("lasuli.ui.doShowMessage", {"title": _("Error"), "content": _('topictree.topic.rename.failed', [arg.name,arg.newName])});
      }
      dispatch("lasuli.ui.doRenameTopicTreeItem", arg);
      _p(100);
      return;
    }
    console.timeEnd("lasuli.core.doRenameTopicTreeItem");
  },

  doTagTopicTreeItem : function(arg){
    console.time("lasuli.core.doTagTopicTreeItem");
    _p(30);
    var result = lasuli.hypertopic.createKeyword(arg.viewpointID, arg.topicID, arg.name);
    _p(40);
    if(!result)
    {
      dispatch("lasuli.ui.doShowMessage", {"title": _("Error"), "content": _('tagItem.failed', [arg.name])});
      _p(100);
      return false;
    }
    _p(50);
    dispatch("lasuli.ui.doShowKeywords", lasuli.hypertopic.keywords);
    _p(60);
    //update the sourceobj rel value
    dispatch("lasuli.ui.doUpdateTopicTreeMenuItem", {"sourceObj": arg.sourceObj, "rel": "keyword" });
    //Remove this topic from analysis list and from the context menu
    dispatch("lasuli.ui.doDestroyAnalysis", arg );
    _p(70);
    dispatch("lasuli.contextmenu.doRemoveMenuItem", arg.topicID );
    _p(100);
    console.timeEnd("lasuli.core.doTagTopicTreeItem");
  },

  doUnTagTopicTreeItem : function(arg){
    console.time("lasuli.core.doUnTagTopicTreeItem");
    _p(30);
    var result = lasuli.hypertopic.destroyKeyword({"topicID":  arg.topicID});
    _p(60);
    if(!result)
    {
      dispatch("lasuli.ui.doShowMessage", {"title": _("Error"), "content": _('tagItem.delete.failed', [arg.name])});
      _p(100);
      return false;
    }
    dispatch("lasuli.ui.doDestroyKeyword", arg);
    dispatch("lasuli.ui.doCreateAnalysis", arg );
    dispatch("lasuli.ui.doUpdateTopicTreeMenuItem", {"sourceObj": arg.sourceObj, "rel": "topic" });
    dispatch("lasuli.contextmenu.doAddMenuItem", arg );
    _p(100);
    console.timeEnd("lasuli.core.doUnTagTopicTreeItem");
  },

  doLoadKeywords : function(viewpointID){
    console.time("lasuli.core.doLoadKeywords");
    lasuli.hypertopic.viewpointID = viewpointID;
    dispatch("lasuli.ui.doShowKeywords", lasuli.hypertopic.keywords);
    console.timeEnd("lasuli.core.doLoadKeywords");
  },

  doDestroyKeyword : function(keyword) {
    console.time("lasuli.core.doDestroyKeyword");
    var topic = lasuli.hypertopic.destroyKeyword(keyword);
    if(!topic)
      dispatch("lasuli.ui.doShowMessage", {"title": _("Error"), "content": _('tagItem.delete.failed', [keyword.name])});
    else
    {
      dispatch("lasuli.ui.doDestroyKeyword", keyword);
      dispatch("lasuli.ui.doCreateAnalysis", topic );
      dispatch("lasuli.contextmenu.doAddMenuItem", topic );
    }
    console.timeEnd("lasuli.core.doDestroyKeyword");
  },

  doRenameKeyword : function(keyword){
    console.time("lasuli.core.doRenameKeyword");
    var result = false;
    if(keyword.newName == keyword.name)
    {
      dispatch("lasuli.ui.doRestoreKeyword",keyword);
      return false;
    }
    var result = lasuli.hypertopic.renameKeyword(keyword);

    if(result){
      keyword.name = keyword.newName;
      lasuli.hypertopic.tags = null;
      dispatch("lasuli.ui.doRestoreKeyword",keyword);
    }
    else{
      dispatch("lasuli.ui.doRestoreKeyword",keyword);
      dispatch("lasuli.ui.doShowMessage", {"title": _("Error"), "content": _('tagItem.rename.failed', [keyword.name,keyword.newName])});
    }
    console.timeEnd("lasuli.core.doRenameKeyword");
  },

  doCreateAnalysis: function(viewpointID){
    console.time("lasuli.core.doCreateAnalysis");
    _p(30);
    var topic = lasuli.hypertopic.createAnalysis(viewpointID);
    _p(60);
    if(topic){
      dispatch("lasuli.ui.doCreateAnalysis", topic );
      dispatch("lasuli.contextmenu.doAddMenuItem", topic );
    }
    else
      dispatch("lasuli.ui.doShowMessage", {"title": _("Error"), "content": _('analysis.topic.create.failed')});
    _p(100);
    console.timeEnd("lasuli.core.doCreateAnalysis");
  },

  doDestroyAnalysis : function(arg){
    console.time("lasuli.core.doDestroyAnalysis");
    var viewpointID = arg.viewpointID;
    var topicID = arg.topicID;
    _p(30);
    var result = lasuli.hypertopic.destroyAnalysis(arg.viewpointID, arg.topicID, arg.name);
    _p(60);
    if(result){
      dispatch("lasuli.ui.doDestroyAnalysis", arg );
      dispatch("lasuli.contextmenu.doRemoveMenuItem", topicID );
      for(var i=0, fragmentID; fragmentID = result[i]; i++)
          dispatch("lasuli.highlighter.doRemoveFragment", fragmentID );
    }
    else
      dispatch("lasuli.ui.doShowMessage", {"title": _("Error"), "content": _('analysis.delete.failed', [arg.name])});
    _p(100);
    console.timeEnd("lasuli.core.doDestroyAnalysis");
  },

  doRenameAnalysis : function(arg){
    console.time("lasuli.core.doRenameAnalysis");
    _p(30);
    var result =lasuli.hypertopic.renameAnalysis(arg.viewpointID, arg.topicID, arg.name, arg.newName);
    _p(60);
    if(result){
      dispatch("lasuli.contextmenu.doUpdateMenuItem", {"viewpointID": arg.viewpointID, "topicID": arg.topicID, "name": arg.newName});
      arg.name = arg.newName;
    }

    dispatch("lasuli.ui.doRestoreAnalysis", arg );
    _p(100);
    console.timeEnd("lasuli.core.doRenameAnalysis");
  },

  doLoadFragments : function(viewpointID){
    console.time("lasuli.core.doLoadFragments");
    lasuli.hypertopic.viewpointID = viewpointID;
    dispatch("lasuli.ui.doShowFragments", {"topics": lasuli.hypertopic.topics, "fragments": lasuli.hypertopic.fragments} );
    this.fragments[lasuli.hypertopic.currentUrl] = lasuli.hypertopic.coordinates;
    dispatch("lasuli.highlighter.doHighlight", {"fragments": lasuli.hypertopic.coordinates});
    //Enable the mozilla context menu
    dispatch('lasuli.contextmenu.doShow', lasuli.hypertopic.topics);
    console.timeEnd("lasuli.core.doLoadFragments");
  },

  doCreateFragment : function(fragment){
    console.time("lasuli.core.doCreateFragment");
    _p(30);
    try{
      var result = lasuli.hypertopic.createFragment(fragment.topicID, fragment.text, [fragment.startPos, fragment.endPos]);
      _p(60);
      var topics = {};
      var fragments = {};
      if(!result){
        _p(100);
        return false;
      }

      if("topic" in result)
      {
        topics[result.topic.topicID] = result.topic;
        dispatch('lasuli.contextmenu.doAddMenuItem', result.topic);
      }

      fragments[result.fragment.getID()] = result.fragment;
      dispatch("lasuli.ui.doShowFragments", {"topics": topics, "fragments": fragments, "scroll": true});
      //Highlight this fragment
      this.fragments[lasuli.hypertopic.currentUrl] = lasuli.hypertopic.coordinates;
      _p(80);
      dispatch("lasuli.highlighter.doHighlight", {"fragments": lasuli.hypertopic.coordinates});
    }catch(e){
      console.error(e);
    }
    _p(100);
    console.timeEnd("lasuli.core.doCreateFragment");
  },

  doDestroyFragment : function(fragment){
    console.time("lasuli.core.doDestroyFragment");
    _p(30);
    var result = lasuli.hypertopic.destroyFragment(fragment.fragmentID);
    _p(60);
    this.fragments[lasuli.hypertopic.currentUrl] = lasuli.hypertopic.coordinates;
    _p(80);
    if(result)
    {
      dispatch("lasuli.ui.doRemoveFragment", fragment.fragmentID );
      dispatch("lasuli.highlighter.doRemoveFragment", fragment.fragmentID );
    }
    _p(100);
    console.timeEnd("lasuli.core.doDestroyFragment");
  },

  doMoveFragment : function(arg){
    console.time("lasuli.core.doMoveFragment");
    _p(30);
    var result = lasuli.hypertopic.moveFragment(arg.fragmentID, arg.targetTopicID);
    _p(60);
    this.fragments[lasuli.hypertopic.currentUrl] = lasuli.hypertopic.coordinates;
    _p(70);
    if(result){
      dispatch("lasuli.ui.doDropFragmentAccepted", arg );
      var color = getColor(arg.targetTopicID);
      dispatch("lasuli.highlighter.doReColorFragment", arg.fragmentID, color );
    }
    else{
      dispatch("lasuli.ui.doShowMessage", {"title": _("Error"), "content": _('analysis.fragment.move.failed')});
      dispatch("lasuli.ui.doDropFragmentDenied", arg );
    }
    _p(100);
    console.timeEnd("lasuli.core.doMoveFragment");
  }
}

lasuli.sidebar = {
  sequence: {},
  init: function(){
    this.changeWorker = new Worker("chrome://lasuli/content/js/change_worker.js");
    this.changeWorker.onmessage = function(event) {
      if(event.data)
      {
        console.log(event.data);
        if(HtServers[event.data])
        {
          if(lasuli.sidebar.sequence[event.data])
          {
            console.log("purge cache" + event.data);
            HtServers[event.data].purgeCache();
          }
          else
            lasuli.sidebar.sequence[event.data] = true;
        }
      }
    }
  },
  onSidebarOpened: function(){
    lasuli.core.register();
    lasuli.core.loadSetting();
    this.changeWorker.postMessage(HtServers);
  },
  onSidebarClosed: function(){
    lasuli.core.unregister();
    this.changeWorker.postMessage('shutdown');
  }
}

window.addEventListener("load", function() {
  lasuli.sidebar.init();
  Observers.add("lasuli.sidebar.onSidebarOpened", lasuli.sidebar.onSidebarOpened, lasuli.sidebar);
  Observers.add("lasuli.sidebar.onSidebarClosed", lasuli.sidebar.onSidebarClosed, lasuli.sidebar);
}, false);

window.addEventListener("unload", function() {
  Observers.remove("lasuli.sidebar.onSidebarOpened", lasuli.sidebar.onSidebarOpened, lasuli);
  Observers.remove("lasuli.sidebar.onSidebarClosed", lasuli.sidebar.onSidebarClosed, lasuli);
}, false);