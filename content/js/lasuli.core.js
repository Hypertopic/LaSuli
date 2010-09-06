include("resource://lasuli/modules/Observers.js");
include("resource://lasuli/modules/Preferences.js");
include("resource://lasuli/modules/log4moz.js");

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
  
  doPrefChange : function(){
    var logger = Log4Moz.repository.getLogger("lasuli.core.doPrefChange");
    logger.level = Log4Moz.Level["Debug"];
    if(lasuli.core.isSidebarOpen())
    {
      logger.debug("sidebar reload");
      document.getElementById("sidebar").contentWindow.location.reload();
    }
    //reInitial HypertopicMapV2
    lasuli.core.loadSetting();
  },
  
  doListViewpoints: function(){
    var logger = Log4Moz.repository.getLogger("lasuli.core.doListViewpoints");
    var viewpoints = HypertopicMapV2.listViewpoints();
    logger.debug(viewpoints);
    //Notify lasuli.ui to show the viewpoints
    Observers.notify("lasuli.ui.doShowViewpoints", viewpoints);
  },
  
  doCreateViewpoint : function(viewpointName){
    var logger = Log4Moz.repository.getLogger("lasuli.core.doCreateViewpoint");
    logger.debug("Name:" + viewpointName);
    var result = HypertopicMapV2.createViewpoint(viewpointName);
    logger.debug(result);
    //reload the viewpoints
    this.doListViewpoints();
  },
  
  doDestroyViewpoint : function(viewpointID){
    var logger = Log4Moz.repository.getLogger("lasuli.core.doDestroyViewpoint");
    HypertopicMapV2.destroyViewpoint(viewpointID);
    this.doListViewpoints();
    Observers.notify("lasuli.ui.doCloseViewpointPanel", viewpointID);
  },
  
  doCreateAttribute : function(attribute){
    var logger = Log4Moz.repository.getLogger("lasuli.core.doCreateAttribute");
    logger.debug(attribute);
    var result = HypertopicMapV2.describeItem(this.itemID, attribute.name, attribute.value);
    logger.debug(result);
    var attributes = HypertopicMapV2.listItemDescriptions(this.itemID);
    Observers.notify("lasuli.ui.doShowAttributes", attributes);
  },
  
  doDestroyAttribute : function(attribute){
    var logger = Log4Moz.repository.getLogger("lasuli.core.doDestroyAttribute");
    logger.debug(attribute);
    var result = HypertopicMapV2.undescribeItem(this.itemID, attribute.name, attribute.value);
    logger.debug(result);
    var attributes = HypertopicMapV2.listItemDescriptions(this.itemID);
    Observers.notify("lasuli.ui.doShowAttributes", attributes);
  },
  
  // A callback function for topics array to get all topic detail information
  _getTopic : function(topic, index, topics){
    var result = HypertopicMapV2.getTopic(topic.viewpoint, topic.id);
    //logger.debug(result);
    result.viewpoint = topic.viewpoint;
    result.id = topic.id;
    if(result.broader)
      delete result.broader;
    if(result.narrower)
      delete result.narrower;
    if(!result.name)
      result.name = _("no.name");
    topics[index] = result;
  },
  
  doLoadDocument : function(url){
    var logger = Log4Moz.repository.getLogger("lasuli.core.doLoadDocument");
    Observers.notify("lasuli.ui.doClearDocumentPanel", null);
    
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
      //logger.debug(result);
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
      return false;
    }
    
    if(this.itemID == null) return false;
    try{  
      // Get the document name and attributes.
      var item = HypertopicMapV2.getItem(this.corpusID, this.itemID);
      //logger.debug("=========item===========");
      //logger.debug(item);
      // Show the item name as the document name
      if(item && item.name && item.name[0])
        Observers.notify("lasuli.ui.doShowItemName", item.name[0]);
      
      // List all discription on the attribute grid
      var attributes = HypertopicMapV2.listItemDescriptions(this.itemID);
      if(attributes)
        Observers.notify("lasuli.ui.doShowAttributes", attributes);
    }catch(e){
      logger.fatal("error when try to get the attribute and item name on item : " + this.itemID);
      logger.fatal(e);
    }
    //logger.debug("=========tags===========");
    //Get the users list, tags, all related topics.
    this.users = new Array();
    this.tags = new Array();
    this.topics = new Array();
    var coordinates = new Array();
    for(var corpusID in this.items)
    {
      logger.debug("coprusID:" + corpusID);
      //Get the users list from corpus
      var corpus = HypertopicMapV2.getCorpus(corpusID);
      //logger.debug("===============users===========");
      //logger.debug(corpus);
      if(corpus.user)
        for(var i=0,user; user = corpus.user[i]; i++)
          if(this.users.indexOf(user) == -1)
            this.users.push(user);
      //logger.debug(this.users);
      
      //logger.debug("===============keywords, topics===========");
      //Get the keyword and the fragments topics
      var itemIDs = this.items[corpusID];
      for(var i=0, itemID; itemID = itemIDs[i]; i++)
      {
        //logger.debug(itemID);
        var item = HypertopicMapV2.getItem(corpusID, itemID);
        //logger.debug(item);
        if(item.topic && item.topic.length > 0)
          for(var j=0, topic; topic = item.topic[j]; j++)
            this.tags.push(topic);
        
        // go through the highlights
        for each (var prop in item)
        {
          if("topic" in prop)
            for(var j=0, topic; topic = prop.topic[j]; j++)
              this.topics.push(topic);
          if("coordinates" in prop)
            for(var j=0, coordinate; coordinate = prop.coordinates[j]; j++)
            {
              
              coordinates.push({ "startPos": coordinate[0], "endPos": coordinate[1], "color": "#FFFF00"});
            }
        }
      }
    }
    logger.debug("===============keywords, topics===========");
    logger.debug(this.tags);
    //logger.debug(this.topics);
    
    Observers.notify("lasuli.ui.doShowUsers", this.users);
    logger.debug("===getTopic===");
    this.tags.forEach(lasuli.core._getTopic);
    this.topics.forEach(lasuli.core._getTopic);
    Observers.notify("lasuli.ui.doShowTagCloud", this.topics.concat(this.tags));
    
    // Highlight all fragments
    Observers.notify("lasuli.highlighter.doHighlight", coordinates);
    
  },
  
  doOpenViewpointByTopicName : function(topicName) {
    var logger = Log4Moz.repository.getLogger("lasuli.core.doOpenViewpointByTopicName");
    logger.debug("topicName: " + topicName);
    if(!this.topics && !this.tags) return false;
    var viewpointIDs = new Array();
    var topics = this.topics.concat(this.tags);
    
    for(var i=0, topic; topic = topics[i]; i++)
    {
      if(topic.name == topicName)
      {
        logger.debug(topic);
        viewpointIDs.push(topic.viewpoint);
      }
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
  
  doOpenViewpointByUser : function(user){
    var logger = Log4Moz.repository.getLogger("lasuli.core.doOpenViewpointByUser");
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
    //TODO filter not related viewpoints
    Observers.notify("lasuli.ui.doShowViewpointPanels", viewpoints);
  },
  
  doLoadTags : function(viewpointID){
    var logger = Log4Moz.repository.getLogger("lasuli.core.doLoadTags");
    logger.debug(viewpointID);
    var tags = new Array();
    logger.debug(this.tags);
    if(this.tags.length > 0)
      for(var i=0, tag; tag = this.tags[i]; i++)
        if(tag.viewpoint == viewpointID)
        {
          tag.topicID = tag.id;
          tag.viewpointID = viewpointID;
          tags.push(tag);
        }
    logger.debug(tags);
    Observers.notify("lasuli.ui.doShowTags", tags);
  },
  
  doCreateTag : function(tag) {
    var logger = Log4Moz.repository.getLogger("lasuli.core.doCreateTag");
    logger.debug(tag);
    var viewpoint = HypertopicMapV2.getViewpoint(tag.viewpointID);
    logger.debug(viewpoint);
    for(var name in viewpoint)
    {
      logger.debug("viewpoint[name]");
      logger.debug(viewpoint[name]);
      logger.debug(typeof(viewpoint[name]));
      if(typeof(viewpoint[name]) != "object" || !("name" in viewpoint[name]))
        continue;
      
      var topic = viewpoint[name];
      logger.debug(topic);
      logger.debug("topic.name[0] == tag.name");
      logger.debug(topic.name[0] == tag.name);
      if(topic.name[0] == tag.name && !("highlight" in topic))
      {
        tag.topicID = name;
        break;
      }
    }
    logger.debug(tag);
    if(!("topicID" in tag))
      try{
        tag.topicID = HypertopicMapV2.createTopicIn(tag.viewpointID, new Array());
        if(!tag.topicID)
          throw Exception("can not create topic");
        HypertopicMapV2.renameTopic(tag.viewpointID, tag.topicID, tag.name);
      }
      catch(e)
      {
        logger.fatal("error when try to create tag");
        logger.fatal(tag);
        logger.fatal(e);
        Observers.notify("lasuli.ui.doShowMessage", {"title": _("Error"), "content": _('tagItem.createtopic.failed', [tag.name])});
      }
    logger.debug(tag);
    try{
      result = HypertopicMapV2.tagItem(this.itemID, tag.viewpointID, tag.topicID);
    }catch(e){
      logger.fatal("error when try to tag the item: " + this.itemID);
      logger.fatal(tag);
      logger.fatal(e);
      Observers.notify("lasuli.ui.doShowMessage", {"title": _("Error"), "content": _('tagItem.failed', [tag.name])});
    }
    Observers.notify("lasuli.core.doUpdateTags", {"action": "add", "tag": tag});
    Observers.notify("lasuli.ui.doShowTags", new Array(tag));
  },
  
  doRemoveTag : function(tag) {
    var logger = Log4Moz.repository.getLogger("lasuli.core.doRemoveTag");
    logger.debug(tag);
    var result = false;
    try{
      result = HypertopicMapV2.untagItem(this.itemID, tag.viewpointID, tag.topicID);
    }catch(e){
      logger.fatal("error when try to remove the following tag from item: " + this.itemID);
      logger.fatal(tag);
      logger.fatal(e);
    }
    if(!result)
    {
      Observers.notify("lasuli.ui.doShowMessage", {"title": _("Error"), "content": _('tagItem.delete.failed', [tag.name])});
      return false;
    }
    else
    {
      Observers.notify("lasuli.core.doUpdateTags", {"action": "remove", "tag": tag});
      Observers.notify("lasuli.ui.doRemoveTag",tag);
    }
  },
  
  doRenameTag : function(tag){
    var logger = Log4Moz.repository.getLogger("lasuli.core.doRenameTag");
    var result = false;
    if(tag.newName == tag.name)
    {
      Observers.notify("lasuli.ui.doRestoreTag",tag);
      return false;
    }
    else
      try{
        result = HypertopicMapV2.renameTopic(tag.viewpointID, tag.topicID, tag.newName);
      }catch(e){
        logger.fatal("error when try to rename tag : ");
        logger.fatal(tag);
        logger.fatal(e);
      }
      
    if(result)
    {
      Observers.notify("lasuli.core.doUpdateTags", {"action": "rename", "tag": tag});
      tag.name = tag.newName;
      delete tag.newName;
      Observers.notify("lasuli.ui.doRestoreTag",tag);
    }
    else
    {
      Observers.notify("lasuli.ui.doRestoreTag",tag);
      Observers.notify("lasuli.ui.doShowMessage", {"title": _("Error"), "content": _('tagItem.rename.failed', [tag.name,tag.newName])});
    }
  },
  
  doUpdateTags : function(act){
    var logger = Log4Moz.repository.getLogger("lasuli.core.doUpdateTags");
    logger.debug(act);
    logger.debug(this.tags);
    switch(act.action){
      case "rename":
        for(var i=0, tag; tag = this.tags[i]; i++)
          if(tag.id == act.tag.topicID && tag.viewpoint == act.tag.viewpointID)
            this.tags[i].name = act.tag.newName;
        break;
      case "remove":
        for(var i=0, tag; tag = this.tags[i]; i++)
          if(tag.id == act.tag.topicID && tag.viewpoint == act.tag.viewpointID)
            this.tags.splice(i,1);
        break;
      case "add":
        var found = false;
        for(var i=0, tag; tag = this.tags[i]; i++)
          if(tag.id == act.tag.topicID && tag.viewpoint == act.tag.viewpointID)
            found = true;
        if(!found)
        {
          var tags = new Array({"viewpoint": act.tag.viewpointID, "id":act.tag.topicID, "name": act.tag.name});
          logger.debug(tags);
          tags.forEach(lasuli.core._getTopic);
          logger.debug(tags);
          this.tags = this.tags.concat(tags);
        }
        break;
    }
    logger.debug(this.tags);
    Observers.notify("lasuli.ui.doShowTagCloud", this.topics.concat(this.tags));
  },
  
  doLoadFragments : function(viewpointID){
    var logger = Log4Moz.repository.getLogger("lasuli.core.doLoadFragments");
    logger.debug(this.topics);
    var items = new Array();
    for each (var rows in this.items){
      items = items.concat(rows);
    }
    logger.debug(items);
    var topics = new Array();
    var fragments = new Array();
    var topicIDs = new Array();
    var tmps = {};
    for(var i=0, topic; topic = this.topics[i];i++)
    {
      if(!topic.highlight) continue;
      if(topic.viewpoint != viewpointID) continue;
      
      if(topicIDs.indexOf(topic.id) < 0)
      {
        topics.push({"viewpointID": viewpointID, "topicID": topic.id, "name": topic.name, "color": colorUtil.index2rgb(i)});
        topicIDs.push(topic.id);
      }
      
      for each (var row in topic.highlight){
        if(items.indexOf(row.item) >= 0)
          tmps[JSON.stringify({"fragmentID": row.id, "startPos": row.coordinates[0], "endPos": row.coordinates[1], "text": row.text,
                        "corpusID": row.corpus, "itemID": row.item, "topicID": topic.id, "viewpointID": viewpointID})] = '';
      }
    }
    for(var fragment in tmps)
      fragments.push(JSON.parse(fragment));
    
    logger.debug(topics);
    logger.debug(fragments);
    Observers.notify("lasuli.ui.doShowFragments", {"topics": topics, "fragments": fragments} );
  },
  
  doMoveFragment : function(arg){
    var helper = arg.helper;
    //helper.fadeOut();
    Observers.notify("lasuli.ui.doDropFragmentAccepted", arg );
    //Observers.notify("lasuli.ui.doDropFragmentDenied", arg );
    
  },
  
  doUntagFragment : function(fragment){
    var logger = Log4Moz.repository.getLogger("lasuli.core.doUntagFragment");
    logger.debug(fragment);
    /*var result = HypertopicMapV2.untagFragment(fragment.itemID, fragment.fragmentID);
    logger.debug(result);
    if(result)*/
     Observers.notify("lasuli.ui.doRemoveFragment", fragment.fragmentID ); 
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