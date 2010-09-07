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
    logger.debug("BaseUrl:" + HypertopicMap.baseUrl);
    logger.debug("Username:" + HypertopicMap.user);
    logger.debug("Password:" + HypertopicMap.pass);
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
  
  getMyCorpusID : function(){
    var logger = Log4Moz.repository.getLogger("lasuli.core.getCorpusID");
    var corpora;
    try{
      corpora = HypertopicMap.listCorpora(HypertopicMap.user);
    }catch(e){
      Observers.notify("lasuli.ui.doShowMessage", {"title": _("Error"), "content": _('couchdb.inaccessible', [HypertopicMap.baseUrl])});
      logger.fatal("CouchDB is not accessible!");
		  return false;
		}
    logger.info(corpora);
    if(!corpora)
      return this.createMyCorpus();
    else
    {
      for(var i=0, corpus; corpus = corpora[i]; i++)
        if(corpus.name == _("default.corpus.name", [HypertopicMap.user]))
        {
          this.myCorpusID = corpus.id;
          return true;
        }
      return this.createMyCorpus();
    }
  },
  
  createMyCorpus : function(){
    var logger = Log4Moz.repository.getLogger("lasuli.core.createCorpus");
    var corpusID = HypertopicMap.createCorpus(_("default.corpus.name", [HypertopicMap.user]), HypertopicMap.user);
    logger.debug(corpusID);
    if(!corpusID)
    {
		  Observers.notify("lasuli.ui.doShowMessage", {"title": _("Warning"), "content": _('create.corpus.warning', [HypertopicMap.user])});
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
    //reInitial HypertopicMap
    lasuli.core.loadSetting();
  },
  
  doListViewpoints: function(){
    var logger = Log4Moz.repository.getLogger("lasuli.core.doListViewpoints");
    var viewpoints = HypertopicMap.listViewpoints();
    logger.debug(viewpoints);
    //Notify lasuli.ui to show the viewpoints
    Observers.notify("lasuli.ui.doShowViewpoints", viewpoints);
  },
  
  doCreateViewpoint : function(viewpointName){
    var logger = Log4Moz.repository.getLogger("lasuli.core.doCreateViewpoint");
    logger.debug("Name:" + viewpointName);
    var result = HypertopicMap.createViewpoint(viewpointName);
    logger.debug(result);
    //reload the viewpoints
    this.doListViewpoints();
  },
  
  doDestroyViewpoint : function(viewpointID){
    var logger = Log4Moz.repository.getLogger("lasuli.core.doDestroyViewpoint");
    HypertopicMap.destroyViewpoint(viewpointID);
    this.doListViewpoints();
    Observers.notify("lasuli.ui.doCloseViewpointPanel", viewpointID);
  },
  
  doCreateAttribute : function(attribute){
    var logger = Log4Moz.repository.getLogger("lasuli.core.doCreateAttribute");
    logger.debug(attribute);
    var result = HypertopicMap.describeItem(this.itemID, attribute.name, attribute.value);
    logger.debug(result);
    var attributes = HypertopicMap.listItemDescriptions(this.itemID);
    Observers.notify("lasuli.ui.doShowAttributes", attributes);
  },
  
  doDestroyAttribute : function(attribute){
    var logger = Log4Moz.repository.getLogger("lasuli.core.doDestroyAttribute");
    logger.debug(attribute);
    var result = HypertopicMap.undescribeItem(this.itemID, attribute.name, attribute.value);
    logger.debug(result);
    var attributes = HypertopicMap.listItemDescriptions(this.itemID);
    Observers.notify("lasuli.ui.doShowAttributes", attributes);
  },
  
  // A callback function for topics array to get all topic detail information
  _getTopic : function(topic, index, topics){
    var result = HypertopicMap.getTopic(topic.viewpoint, topic.id);
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
      var result = HypertopicMap.getResources(url);
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
      var item = HypertopicMap.getItem(this.corpusID, this.itemID);
      //logger.debug("=========item===========");
      //logger.debug(item);
      // Show the item name as the document name
      if(item && item.name && item.name[0])
        Observers.notify("lasuli.ui.doShowItemName", item.name[0]);
      
      // List all discription on the attribute grid
      var attributes = HypertopicMap.listItemDescriptions(this.itemID);
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
      var corpus = HypertopicMap.getCorpus(corpusID);
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
        var item = HypertopicMap.getItem(corpusID, itemID);
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
      var viewpoint = HypertopicMap.getViewpoint(viewpointID);
      if(viewpoint) viewpoints.push(viewpoint);
    }
    Observers.notify("lasuli.ui.doShowViewpointPanels", viewpoints);
  },
  
  doOpenViewpointByUser : function(user){
    var logger = Log4Moz.repository.getLogger("lasuli.core.doOpenViewpointByUser");
    //logger.debug("user: " + user);
    var corpora = HypertopicMap.listCorpora(user);
    //logger.debug(corpora);
    if(!corpora) return false;
    
    var viewpointIDs = new Array();
    for(var i=0, corpus; corpus = corpora[i];i++)
    {
      corpus = HypertopicMap.getCorpus(corpus.id);
      var strCorpus = JSON.stringify(corpus);
      while( result = /\"viewpoint\":\s?\"([a-zA-z0-9]+)\"/ig.exec(strCorpus))
        if(typeof(result[1]) != "undefined" && viewpointIDs.indexOf(result[1]) == -1) viewpointIDs.push(result[1]);
    }
    logger.debug(viewpointIDs);
    var viewpoints = new Array();
    for(var i=0, viewpointID; viewpointID = viewpointIDs[i]; i++)
    {
      var viewpoint = HypertopicMap.getViewpoint(viewpointID);
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
    var viewpoint = HypertopicMap.getViewpoint(tag.viewpointID);
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
        tag.topicID = HypertopicMap.createTopicIn(tag.viewpointID, new Array());
        if(!tag.topicID)
          throw Exception("can not create topic");
        HypertopicMap.renameTopic(tag.viewpointID, tag.topicID, tag.name);
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
      result = HypertopicMap.tagItem(this.itemID, tag.viewpointID, tag.topicID);
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
      result = HypertopicMap.untagItem(this.itemID, tag.viewpointID, tag.topicID);
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
        result = HypertopicMap.renameTopic(tag.viewpointID, tag.topicID, tag.newName);
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
    
    var viewpoint = HypertopicMap.getViewpoint(viewpointID);
    logger.debug(viewpoint);
    var analysisTopics = new Array();
    for(var id in viewpoint)
      if(viewpoint[id].name && topicIDs.indexOf(id) < 0)
      {
        var i = this.topics.length + analysisTopics.length;
        analysisTopics.push({"viewpointID": viewpointID, "topicID": id, "name": viewpoint[id].name, "color": colorUtil.index2rgb(i)});
      }
    
    topics = topics.concat(analysisTopics);
    Observers.notify("lasuli.ui.doShowFragments", {"topics": topics, "fragments": fragments} );
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
          }
      }
      //logger.debug(this.topics);
      //logger.debug(tmp);
      var found = false;
      if(tmp)
        for(var i=0, topic; topic = this.topics[i];i++)
        {
          if(topic.viewpoint != arg.viewpointID) continue;
          
          if(topic.id == arg.targetTopicID){
            if(!topic.highlight) this.topics[i].highlight = new Array();
            this.topics[i].highlight.push(tmp);
            found = true;
          }
        }
      logger.debug(found);  
      if(!found)
      {
        var topic = HypertopicMap.getTopic(arg.viewpointID, arg.targetTopicID);
        /*logger.debug(topic);
        if(!topic.highlight) topic.highlight = new Array();
        topic.highlight.push(tmp);*/
        this.topics.push(topic);
      }
      logger.debug(this.topics);
      //Update tagcloud
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
            j--;
          }
      Observers.notify("lasuli.ui.doRemoveFragment", fragment.fragmentID ); 
      Observers.notify("lasuli.ui.doShowTagCloud", this.topics.concat(this.tags));
    }
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
      //Repaint the tagcloud
      Observers.notify("lasuli.ui.doShowTagCloud", this.topics.concat(this.tags));
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
      for(var i=0, topic; topic = this.topics[i]; i++)
        if(topic.id == topicID && topic.viewpoint == viewpointID)
        {  
          this.topics.splice(i, 1);
          i--;
        }
      //Repaint the tagcloud
      Observers.notify("lasuli.ui.doShowTagCloud", this.topics.concat(this.tags));
      
      Observers.notify("lasuli.ui.doDestroyAnalysis", arg ); 
    }
    else
    {
      Observers.notify("lasuli.ui.doShowMessage", {"title": _("Error"), "content": _('analysis.delete.failed', [arg.name])});
      return false;
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