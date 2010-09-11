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
      Observers.notify("lasuli.ui.doBlockUI", null);
      return false;
    }
    Observers.notify("lasuli.ui.doUnBlockUI", null);

    Observers.notify("lasuli.ui.doCloseViewpointPanel", null);
    Observers.notify("lasuli.core.doLoadDocument", null);
  },

  doLoadDocument : function(){
    var logger = Log4Moz.repository.getLogger("lasuli.core.doLoadDocument");
    Observers.notify("lasuli.ui.doClearDocumentPanel", null);

    Observers.notify("lasuli.ui.doShowItemName", lasuli.hypertopic.itemName);
    Observers.notify("lasuli.ui.doShowAttributes", lasuli.hypertopic.attributes);
    Observers.notify("lasuli.ui.doShowUsers", lasuli.hypertopic.users);
    Observers.notify("lasuli.ui.doShowTagCloud", lasuli.hypertopic.tags);
    // Highlight all fragments
    Observers.notify("lasuli.highlighter.doHighlight", lasuli.hypertopic.allFragments);
  },

  doListViewpoints: function(){
    var logger = Log4Moz.repository.getLogger("lasuli.core.doListViewpoints");
    //Notify lasuli.ui to show the viewpoints
    Observers.notify("lasuli.ui.doShowViewpoints", lasuli.hypertopic.viewpoints);
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
    Observers.notify("lasuli.ui.doCloseViewpointPanel", viewpointID);
  },


  doRenameItem : function(arg){
    var logger = Log4Moz.repository.getLogger("lasuli.core.doRenameItem");
    logger.debug(arg);
    try{
      lasuli.hypertopic.itemName = arg.newName;
      Observers.notify('lasuli.ui.doDisplayItemName', arg.newName);
    }catch(e){
      //TODO Show error message
      Observers.notify('lasuli.ui.doDisplayItemName', arg.name);
    }
  },

  doCreateAttribute : function(attribute){
    var logger = Log4Moz.repository.getLogger("lasuli.core.doCreateAttribute");
    lasuli.hypertopic.createAttribute(attribute);
    Observers.notify("lasuli.ui.doShowAttributes", lasuli.hypertopic.attributes);
  },

  doDestroyAttribute : function(attribute){
    var logger = Log4Moz.repository.getLogger("lasuli.core.doDestroyAttribute");
    lasuli.hypertopic.destroyAttribute(attribute);
    Observers.notify("lasuli.ui.doShowAttributes", lasuli.hypertopic.attributes);
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
    Observers.notify("lasuli.ui.doShowViewpointPanels", viewpoints);
  },

  doOpenViewpointByUser : function(user){
    var logger = Log4Moz.repository.getLogger("lasuli.core.doOpenViewpointByUser");
    var viewpoints = new Array();
    var viewpointIDs = lasuli.hypertopic.getViewpointIDsByUser(user);
    for(var i=0, viewpointID; viewpointID = viewpointIDs[i]; i++)
      viewpoints.push({"id": viewpointID, "name": lasuli.hypertopic.getViewpointName(viewpointID)});
    logger.debug(viewpoints);
    //TODO filter not related viewpoints
    Observers.notify("lasuli.ui.doShowViewpointPanels", viewpoints);
  },

  doLoadKeywords : function(viewpointID){
    var logger = Log4Moz.repository.getLogger("lasuli.core.doLoadKeywords");
    logger.debug(viewpointID);
    lasuli.hypertopic.viewpointID = viewpointID;
    Observers.notify("lasuli.ui.doShowKeywords", lasuli.hypertopic.keywords);
  },

  doCreateKeyword : function(keyword) {
    var logger = Log4Moz.repository.getLogger("lasuli.core.doCreateKeyword");
    logger.debug(keyword);

    //Clear the tags cache
    lasuli.hypertopic.tags = null;
    var result = lasuli.hypertopic.createKeyword(keyword.viewpointID, keyword.name);
    if(!result) return false;

    logger.debug(result);
    Observers.notify("lasuli.ui.doShowKeywords", lasuli.hypertopic.keywords);
    Observers.notify("lasuli.ui.doShowTagCloud", lasuli.hypertopic.tags);
  },

  doRemoveKeyword : function(keyword) {
    var logger = Log4Moz.repository.getLogger("lasuli.core.doRemoveKeyword");
    logger.debug(keyword);
    var result = lasuli.hypertopic.destroyKeyword(keyword);
    logger.debug(result);
    if(!result)
      Observers.notify("lasuli.ui.doShowMessage", {"title": _("Error"), "content": _('tagItem.delete.failed', [tag.name])});
    else
    {
      Observers.notify("lasuli.ui.doRemoveKeyword", keyword);
      lasuli.hypertopic.tags = null;
      Observers.notify("lasuli.ui.doShowTagCloud", lasuli.hypertopic.tags);
    }
  },

  doRenameKeyword : function(keyword){
    var logger = Log4Moz.repository.getLogger("lasuli.core.doRenameKeyword");
    var result = false;
    if(keyword.newName == keyword.name)
    {
      Observers.notify("lasuli.ui.doRestoreKeyword",keyword);
      return false;
    }
    var result = lasuli.hypertopic.renameKeyword(keyword);

    if(result){
      keyword.name = keyword.newName;
      Observers.notify("lasuli.ui.doRestoreKeyword",keyword);
      lasuli.hypertopic.tags = null;
      Observers.notify("lasuli.ui.doShowTagCloud", lasuli.hypertopic.tags);
    }
    else{
      Observers.notify("lasuli.ui.doRestoreKeyword",keyword);
      Observers.notify("lasuli.ui.doShowMessage", {"title": _("Error"), "content": _('tagItem.rename.failed', [keyword.name,keyword.newName])});
    }
  },

  doLoadFragments : function(viewpointID){
    var logger = Log4Moz.repository.getLogger("lasuli.core.doLoadFragments");
    lasuli.hypertopic.viewpointID = viewpointID;
    Observers.notify("lasuli.ui.doShowFragments", {"topics": lasuli.hypertopic.topics, "fragments": lasuli.hypertopic.fragments} );
    //Enable the mozilla context menu
    Observers.notify('lasuli.contextmenu.doShow', lasuli.hypertopic.topics);
  },

  doMoveFragment : function(arg){
    var logger = Log4Moz.repository.getLogger("lasuli.core.doMoveFragment");
    //logger.debug(arg);

    var result = HypertopicMap.moveFragment(arg.itemID, arg.fragmentID, arg.viewpointID, arg.targetTopicID);
    if(result){
      //Update cache
      var tmp = null;
      //logger.debug(this.topics);
      for(var i=0, topic; topic = this.topics[i];i++)
      {
        if(!topic.highlight) continue;
        if(topic.viewpoint != arg.viewpointID) continue;

        for(var j=0, row; row = this.topics[i].highlight[j]; j++)
          if(row.id == arg.fragmentID){
            tmp = row;
            //logger.debug("Row num:" + j);
            //logger.debug(this.topics[i].highlight);
            this.topics[i].highlight.splice(j, 1);
            //logger.debug(this.topics[i].highlight);
            j--;
            if(this.topics[i].highlight.length == 0)
            {
              this.eTopics.push(this.topics[i]);
              this.topics[i].splice(i,1);
              i--;
              break;
            }
          }
      }
      //logger.debug(this.topics);
      //logger.debug(tmp);
      var found = false;
      if(tmp)
      {
        for(var i=0, topic; topic = this.topics[i];i++)
        {
          if(topic.viewpoint != arg.viewpointID) continue;

          if(topic.id == arg.targetTopicID){
            if(!topic.highlight) this.topics[i].highlight = new Array();
            this.topics[i].highlight.push(tmp);
            found = true;
          }
        }
        for(var i=0, topic; topic = this.eTopics[i];i++)
        {
          if(topic.viewpoint != arg.viewpointID) continue;

          if(topic.id == arg.targetTopicID){
            if(!topic.highlight) this.eTopics[i].highlight = new Array();
            this.eTopics[i].highlight.push(tmp);
            this.topics.push(this.eTopics[i]);
            this.eTopics[i].splice(i,1);
            i--;
            found = true;
          }
        }
      }
      logger.debug(found);
      if(!found)
      {
        var topic = HypertopicMap.getTopic(arg.viewpointID, arg.targetTopicID);
        this.topics.push(topic);
      }
      logger.debug(this.topics);
      //Update tagcloud
      //TODO when the topics highlight is null move this topic to eTopics
      Observers.notify("lasuli.ui.doShowTagCloud", this.topics.concat(this.tags));
      Observers.notify("lasuli.ui.doDropFragmentAccepted", arg );
    }
    else{
      Observers.notify("lasuli.ui.doShowMessage", {"title": _("Error"), "content": _('analysis.fragment.move.failed')});
      Observers.notify("lasuli.ui.doDropFragmentDenied", arg );
    }
  },

  doUntagFragment : function(fragment){
    var logger = Log4Moz.repository.getLogger("lasuli.core.doUntagFragment");
    //logger.debug(fragment);
    var result = HypertopicMap.untagFragment(fragment.itemID, fragment.fragmentID);
    //logger.debug(result);
    if(result){
      for(var i=0, topic; topic = this.topics[i];i++)
        for(var j=0, row; row = this.topics[i].highlight[j]; j++)
          if(row.id == fragment.fragmentID){
            this.topics[i].highlight.splice(j, 1);
            //TODO when the topics highlight is null move this topic to eTopics
            j--;
          }
      Observers.notify("lasuli.ui.doRemoveFragment", fragment.fragmentID );
      Observers.notify("lasuli.ui.doShowTagCloud", this.topics.concat(this.tags));
    }
  },

  _addAnalysis : function(viewpointID){
    var logger = Log4Moz.repository.getLogger("lasuli.core._addAnalysis");
    var topicID = HypertopicMap.createTopicIn(viewpointID, new Array());
    if(!topicID)
    {
      Observers.notify("lasuli.ui.doShowMessage", {"title": _("Error"), "content": _('analysis.topic.create.failed')});
      return false;
    }
    logger.debug(topicID);
    var topicName = _("no.name");
    var result = HypertopicMap.renameTopic(viewpointID, topicID, topicName);
    logger.debug(result);
    var topic = HypertopicMap.getTopic(viewpointID, topicID);
    this.eTopics.push(topic);
    topic.color = colorUtil.index2rgb(this.topics.length + this.eTopics.length);
    topic.viewpointID = topic.viewpoint;
    topic.topicID = topic.id;
    logger.debug(topic);

    Observers.notify("lasuli.ui.doAddAnalysis", topic );
    Observers.notify("lasuli.contextmenu.doAddMenuItem", topic );
  },

  doAddAnalysis: function(viewpointID){
    var logger = Log4Moz.repository.getLogger("lasuli.core.doAddAnalysis");
    logger.debug(viewpointID);
    this._addAnalysis(viewpointID);
  },

  doRenameAnalysis : function(arg){
    var logger = Log4Moz.repository.getLogger("lasuli.core.doRenameAnalysis");
    var viewpointID = arg.viewpointID;
    var topicID = arg.topicID;
    var name = arg.name;
    var newName = arg.newName;
    var result = HypertopicMap.renameTopic(viewpointID, topicID, newName);
    logger.debug(result);
    if(result){
      for(var i=0, topic; topic = this.topics[i]; i++)
      {
        logger.debug(topic.id + "," + topic.viewpoint + "|" + topicID + "," + viewpointID);
        if(topic.id == topicID && topic.viewpoint == viewpointID){
          logger.debug("found:" + i);
          this.topics[i].name = newName;
        }
      }
      //Update the cache of non-used-analysis topics
      for(var i=0, topic; topic = this.eTopics[i]; i++)
        if(topic.id == topicID && topic.viewpoint == viewpointID)
          this.eTopics[i].name = newName;

      //Repaint the tagcloud
      logger.debug("this.topics");
      logger.debug(this.topics);
      logger.debug(this.tags);
      Observers.notify("lasuli.ui.doShowTagCloud", this.topics.concat(this.tags));
      Observers.notify("lasuli.contextmenu.doUpdateMenuItem", {"viewpointID": viewpointID, "topicID": topicID, "name": newName});
      delete arg.name;
    }

    Observers.notify("lasuli.ui.doRestoreAnalysis", arg );
  },

  doDestroyAnalysis : function(arg){
    var logger = Log4Moz.repository.getLogger("lasuli.core.doDestroyAnalysis");
    var viewpointID = arg.viewpointID;
    var topicID = arg.topicID;
    var result = HypertopicMap.destroyTopic(viewpointID, topicID);
    logger.debug(result);
    if(result)
    {
      var shouldTagCloud = false;
      for(var i=0, topic; topic = this.topics[i]; i++)
        if(topic.id == topicID && topic.viewpoint == viewpointID)
        {
          this.topics.splice(i, 1);
          i--;
          shouldTagCloud = true;
        }
      for(var i=0, topic; topic = this.eTopics[i]; i++)
        if(topic.id == topicID && topic.viewpoint == viewpointID)
        {
          this.eTopics.splice(i, 1);
          i--;
        }
      //Repaint the tagcloud
      if(shouldTagCloud)
        Observers.notify("lasuli.ui.doShowTagCloud", this.topics.concat(this.tags));

      Observers.notify("lasuli.ui.doDestroyAnalysis", arg );
    }
    else
    {
      Observers.notify("lasuli.ui.doShowMessage", {"title": _("Error"), "content": _('analysis.delete.failed', [arg.name])});
      return false;
    }
  },

  doCreateFragment : function(fragment){
    var logger = Log4Moz.repository.getLogger("lasuli.core.doCreateFragment");
    logger.debug(fragment);

    if(!this.itemID) this.createItem();
    fragment.itemID = this.itemID;

    if(!fragment.topicID)

    fragment.fragmentID = HypertopicMap.tagFragment(this.itemID, new Array(startPos, endPos), strContent, fragment.viewpointID, fragment.topicID);

    //TODO topicID is null, create topic first

    //TODO add the fragment to cache

    Observers.notify("lasuli.ui.doAddFragments", {"fragments": new Array(fragment)});
    //TODO update the tag cloud
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