include("resource://lasuli/modules/HypertopicMap.js");
include("resource://lasuli/modules/Preferences.js");

var MemCache = {};
var enableCache = Preferences.get("extensions.lasuli.cache", true); //set to true for debug

lasuli.hypertopic = {
  _locations : {},

  get currentUrl(){
    return this._currentUrl;
  },
  set currentUrl(url){
    var logger = Log4Moz.repository.getLogger("lasuli.hypertopic.currentUrl");
    //logger.trace(url);
    MemCache = {};
    this._currentUrl = url;
    this._viewpointID = null;
    if(url == "about:blank") return false;
  },
  get viewpoint(){
    var k = (this._locations[this.viewpointID]) ? this._locations[this.viewpointID] : "freecoding";
    return HtServers[k].getViewpoint(this.viewpointID);
  },
  get viewpointID(){
    return this._viewpointID;
  },
  set viewpointID(id){
    this._viewpointID = id;
    MemCache.fragments = false;
    MemCache.coordinates = false;
    MemCache.topics = false;
    MemCache.keywords = false;
  },
  /**
   * @return a map
   */
  get users(){
    if(enableCache && MemCache.users) return MemCache.users;
    var logger = Log4Moz.repository.getLogger("lasuli.hypertopic.users");
    var result = {};
    logger.trace(HtServers);
    for(var key in HtServers)
    {
      //logger.trace(key);
      try{
        var user = HtServers[key].getUser();
        //logger.trace(user);
        if(user)
        {
          //logger.trace(user.getObject());
          result[key] = user;
        }
      }catch(e){ logger.fatal(e.message); }
    }
    MemCache.users = result;
    return result;
  },
  get user(){
    if(this.users && this.users.freecoding)
      return this.users.freecoding;
    else
      return null;
  },
  get corpus(){
    if(enableCache && MemCache.corpus) return MemCache.corpus;
    var logger = Log4Moz.repository.getLogger("lasuli.hypertopic.corpus");
    var result = null, corpusID;
    
    logger.debug("get corpus");

    for(var k in this.items) {
      corpusID = this.items[k].getCorpusID();
      if (corpusID) break;
    }
    if(corpusID) {
      logger.debug('Corpus ' + corpusID + ' found');
      var corpus = HtServers.freecoding.getCorpus(corpusID);
      if(corpus.getView() === false) {
        logger.debug('but not its duplicate on the default server');
        var ret = corpus.createWithID(corpusID, corpusID);
        logger.debug(ret);
        if(!ret) {
          logger.fatal('unable to create a corpus with a specific ID:' + corpusID);
          return false;
        }
        return ret;
      }
      return corpus;
    }
    
    logger.debug("none corpus was found! Need to use user's corpus!");
    var corpora,
        user = this.user;
    try{
      logger.debug("user.listCorpora");
      if(user)
        corpora = user.listCorpora();
    }catch(e){ logger.fatal(e.message); }

    if(!corpora || corpora.length == 0){
      try{
        logger.debug("try to create a new corpus");
        var corpusName = _("default.corpus.name", [user.getID()]);

        var corpus = user.createCorpus(corpusName);
        logger.debug("created a corpus");
        if(corpus)
          result = corpus;
      }catch(e){ logger.fatal(e.message); }
    }
    else
      try{
        result = HtServers.freecoding.getCorpus(corpora[0].id);
      }catch(e){ logger.fatal(e.message); }
    MemCache.corpus = result;
    return result;
  },
  /**
   * @return a map
   */
  get items(){
    if(enableCache && MemCache.items) return MemCache.items;
    var logger = Log4Moz.repository.getLogger("lasuli.hypertopic.items");
    var startTime = new Date().getTime();
    var item, items = {};
    //Load items from all Hypertopic server by using resource URL
    for(var k in HtServers)
    {
      try{
        item = HtServers[k].getItem(this.currentUrl);
        if(item)
          items[k] = item;
      }catch(e){
        logger.fatal(e.message);
        logger.error(k);
        logger.error(this.currentUrl);
      }
    }
    logger.debug(items);
    MemCache.items = items;
    logger.trace("Execution time: " + ((new Date().getTime()) - startTime) + "ms");
    return items;
  },
  get item(){
    //Get item from freecoding server
    var logger = Log4Moz.repository.getLogger("lasuli.hypertopic.item");
    logger.debug("get item");
    logger.debug(this.items);
    logger.debug(this.items["freecoding"]);
    
    if(!this.items || !this.items["freecoding"])
      return null;
    return this.items["freecoding"];
  },
  get itemName(){
    var logger = Log4Moz.repository.getLogger("lasuli.hypertopic.itemName");
    return (this.item) ? this.item.getName() : _("no.name");
  },
  set itemName(name){
    var logger = Log4Moz.repository.getLogger("lasuli.hypertopic.itemName");
    //logger.trace('rename item:' + name);
    try{
      if(!this.item)
      {
        //logger.trace('Need to create a new item.');
        this.createItem(name);
        return true;
      }
      else
      {
        MemCache.items = false;
        return this.item.rename(name);
      }
    }catch(e){
      logger.fatal(e.message);
      logger.error(name);
      return false;
    }
  },
  /**
   * @return a map of attributes (each key may have a list of values)
   */
  get attributes(){
    if(enableCache && MemCache.attributes) return MemCache.attributes;
    var logger = Log4Moz.repository.getLogger("lasuli.hypertopic.attributes");

    var result,attributes = {};
    for(var k in this.items)
    {
      try{
        var item = this.items[k];
        result = item.getAttributes();
        logger.debug(item);
        logger.debug(result);
      if(result)
        attributes[k] = result;
      }catch(e){
        logger.fatal(e.message);
        logger.error(k);
        logger.error(result);
      }
    }

    result = {};
    for(var k in attributes)
      for(var i=0, attribute; attribute = attributes[k][i]; i++)
      {
        if(!result[attribute.name])
          result[attribute.name] = new Array();
        var strValue = attribute.value + "";
        var idx = result[attribute.name].indexOf(strValue);
        if(idx == -1)
          result[attribute.name].push(strValue);
      }
    logger.debug(result);
    MemCache.attributes = result;
    return result;
  },
  /**
   * @return a list
   */
  get docUsers(){
    if(enableCache && MemCache.docUsers) return MemCache.docUsers;
    var logger = Log4Moz.repository.getLogger("lasuli.hypertopic.docUsers");
    var result = new Array();
    //Try to get all viewpoint from topics and keywords
    var viewpoints = {};
    var startTime = new Date().getTime();
    try{
      var docTopics = this.docTopics;
      var docKeywords = this.docKeywords;
      startTime = new Date().getTime();
      for (var t of Iterator(docTopics)) {
        var topic = t[1];
        var viewpointID = topic.getViewpointID();
        if(!(viewpointID in viewpoints) && topic.Viewpoint)
          viewpoints[viewpointID] = topic.Viewpoint;
      }
      for (var t of Iterator(docKeywords)) {
        var topic = t[1];
        var viewpointID = topic.getViewpointID();
        if(!(viewpointID in viewpoints) && topic.Viewpoint)
          viewpoints[viewpointID] = topic.Viewpoint;
      }
      //logger.trace(viewpoints);
    }catch(e){ logger.fatal(e.message); }
    //Get all users from the viewpoints
    try{
      for (var viewpoint of Iterator(viewpoints)) {
        var users = viewpoint[1].listUsers();
        if(users)
          for(var i=0, user; user = users[i]; i++)
            if(result.indexOf(user) < 0)
              result.push(user);
      }
    }catch(e){ logger.fatal(e.message); }
    //logger.trace(result);
    MemCache.docUsers = result;
    logger.trace("Execution time: " + ((new Date().getTime()) - startTime) + "ms");
    return result;
  },
  /**
   * @return a map
   */
  get docFragments(){
    if(enableCache && MemCache.docFragments) return MemCache.docFragments;
    var logger = Log4Moz.repository.getLogger("lasuli.hypertopic.docFragments");
    var startTime, result = {};
    try{
      var items = this.items;
      startTime = new Date().getTime();
      var topics = {};
      logger.info(items);
      for(var k in items){
        var item = items[k];
        var startTime2 = new Date().getTime();
        var fragments = item.getHighlights();
        logger.info(fragments);
        for(var j=0, fragment; fragment = fragments[j]; j++){
          this._locations[fragment.getID()] = k;
          result[fragment.getID()] = fragment;
          var t = fragment.getTopic();
          if(!(t.id in topics))
          {
            //Find out which server the viewpoint is located.
            var server = this.getViewpointLocation(t.viewpoint, k);
            if(!server) continue;
            topics[t.id] = HtServers[server].getTopic(t);
          }
          fragment.topic = topics[t.id];
        }
      }
    }catch(e){ logger.fatal(e.message); }
    logger.trace("Execution time: " + ((new Date().getTime()) - startTime) + "ms ");
    MemCache.docFragments = result;
    return result;
  },
  /**
   * @return a map
   */
  get docKeywords(){
    if(enableCache && MemCache.docKeywords) return MemCache.docKeywords;
    var logger = Log4Moz.repository.getLogger("lasuli.hypertopic.docKeywords");
    var startTime;
    var docKeywords = {};
    try{
      var items = this.items;
      startTime = new Date().getTime();
      for (var item of Iterator(items)) {
        var topics = item[1].getTopics();
        if(topics)
        {
          //logger.trace(topics);
          for(var j=0, topic; topic = topics[j]; j++)
          {
            var topicID = topic.getID();
            if(topicID in docKeywords)
              docKeywords[topicID].count++;
            else
            {
              docKeywords[topicID] = topic;
              docKeywords[topicID].count = 1;
            }
          }
        }
      }
    }catch(e){ logger.fatal(e.message); }
    //logger.trace(docKeywords);
    MemCache.docKeywords = docKeywords;
    logger.trace("Execution time: " + ((new Date().getTime()) - startTime) + "ms");
    return docKeywords;
  },
  /**
   * @return a map
   */
  get docTopics(){
    if(enableCache && MemCache.docTopics) return MemCache.docTopics;
    var startTime = new Date().getTime();
    var logger = Log4Moz.repository.getLogger("lasuli.hypertopic.docTopics");
    var docTopics = {};
    try{
      var docFragments = this.docFragments;
      var startTime = new Date().getTime();
      for (var fragment of Iterator(docFragments)) {
        var topic = fragment[1].topic;
        var topicID = topic.getID();
        if(topicID in docTopics)
          docTopics[topicID].count++;
        else
        {
          docTopics[topicID] = topic;
          docTopics[topicID].count = 1;
        }
      }
    }catch(e){ logger.fatal(e.message); }
    //logger.trace(docTopics);
    MemCache.docTopics = docTopics;
    logger.trace("Execution time: " + ((new Date().getTime()) - startTime) + "ms");
    return docTopics;
  },
  /**
   * @return a map
   */
  get docTags(){
    if(enableCache && MemCache.docTags) return MemCache.docTags;
    var startTime = new Date().getTime();
    var logger = Log4Moz.repository.getLogger("lasuli.hypertopic.docTags");

    var result = {};
    try{
      for (var t of Iterator(this.docTopics)) {
        var topic = t[1];
        //logger.trace("topic");
        //logger.trace(topic.getObject());
        var topicName = topic.getName();
        //logger.trace(topicName);
        if(topicName)
          if(topicName in result)
            result[topicName].size++;
          else
            result[topicName] = {"size": topic.count};
      }
      //logger.trace(result);
      for (var t of Iterator(this.docKeywords)) {
        var topic = t[1];
        var topicName = topic.getName();
        if(topicName)
          if(topicName in result)
            result[topicName].size++;
          else
            result[topicName] = {"size": topic.count};
      }
    }catch(e){ logger.fatal(e.message); }
    //logger.trace(result);
    MemCache.docTags = result;
    logger.trace("Execution time: " + ((new Date().getTime()) - startTime) + "ms");
    return result;
  },
  /**
   * @return a map
   */
  get docCoordinates(){
    if(enableCache && MemCache.docCoordinates) return MemCache.docCoordinates;
    var startTime = new Date().getTime();
    var logger = Log4Moz.repository.getLogger("lasuli.hypertopic.docCoordinates");

    var result = {};
    try{
      for (var f of Iterator(this.docFragments)) {
        var fragment = f[1];
        var coordinate = fragment.getCoordinates();
        //logger.trace({ "startPos": coordinate[0], "endPos": coordinate[1]});
        result[fragment.getID()]={ "startPos": coordinate[0], "endPos": coordinate[1]};
      }
    }catch(e){ logger.fatal(e.message); }
    //logger.trace(result);
    MemCache.docCoordinates = result;
    logger.trace("Execution time: " + ((new Date().getTime()) - startTime) + "ms");
    return result;
  },
  /**
   * @return a map
   */
  get topics(){
    if(enableCache && MemCache.topics) return MemCache.topics;
    var logger = Log4Moz.repository.getLogger("lasuli.hypertopic.topics");
    var topics, result = {};
    try{
      topics = this.viewpoint.getTopics();
    }catch(e){ logger.fatal(e.message); }
    for(var i=0, topic; topic = topics[i]; i++)
      try{
        if(!(topic.getID() in this.keywords))
        {
            var topicName = topic.getName();
            if(!topicName) continue;
            result[topic.getID()] =  {"topicID": topic.getID(), "viewpointID": this.viewpointID, "name": topicName};
        }
      }catch(e){
        logger.fatal(e.message);
        logger.error(topic);
      }

    for(var topicID in result)
      result[topicID].color = getColor(topicID);
    //logger.trace(result);
    MemCache.topics = result;
    return result;
  },
  /**
   * @return a map
   */
  get keywords(){
    if(enableCache && MemCache.keywords) return MemCache.keywords;
    var logger = Log4Moz.repository.getLogger("lasuli.hypertopic.keywords");

    var result = {};
    //logger.trace("viewpoint keywords");
    for (var t of Iterator(this.docKeywords)) {
      var topic = t[1];
      try{
        if(topic.getViewpointID() == this.viewpointID)
        {
          var topicName = topic.getName();
          if(!topicName) continue;
          result[topic.getID()] = {"topicID": topic.getID(), "viewpointID": this.viewpointID, "name": topicName};
        }
      }catch(e){
        logger.fatal(e.message);
        logger.error(topic);
      }
    }
    //logger.trace(result);
    MemCache.keywords = result;
    return result;
  },
  /**
   * @return a map
   */
  get fragments(){
    if(enableCache && MemCache.fragments) return MemCache.fragments;
    var logger = Log4Moz.repository.getLogger("lasuli.hypertopic.fragments");
    var result = {};
    for (var f of Iterator(this.docFragments)) {
      var fragment = f[1];
      try{
        var topic = fragment.topic;
        if(topic.getViewpointID() == this.viewpointID)
          result[fragment.getID()] = fragment;
      }catch(e){
        logger.fatal(e.message);
        logger.fatal(fragment);
      }
    }
    //logger.trace(result);
    MemCache.fragments = result;
    return result;
  },
  /**
   * @return a map
   */
  get coordinates(){
    if(enableCache && MemCache.coordinates) return MemCache.coordinates;
    var logger = Log4Moz.repository.getLogger("lasuli.hypertopic.coordinates");
    var coordinate, topicID, result = {};

    for (var f of Iterator(this.fragments)) {
      var fragment = f[1];
      try{
        coordinate = fragment.getCoordinates();
        topicID = fragment.topic.getID();
        //logger.trace(topicID);
        if(!this.topics[topicID]) continue;
        var color = getColor(topicID);
        //logger.trace(color);
        result[fragment.getID()]={ "startPos": coordinate[0], "endPos": coordinate[1], "color": color};
      }catch(e){
        logger.fatal(e.message);
        logger.error(fragment);
      }
    }
    //logger.trace(result);
    MemCache.coordinates = result;
    return result;
  },
  /**
   * @return a map
   */
  get viewpoints(){
    if(enableCache && MemCache.viewpoints) return MemCache.viewpoints;
    var logger = Log4Moz.repository.getLogger("lasuli.hypertopic.viewpoints");

    var result = {};
    if(!this.user)
    {
      logger.fatal("User {" + HtServers.freecoding.user + "} isn't exist yet");
      return null;
    }
    try{
      var viewpoints = this.user.listViewpoints();
      if(!viewpoints) return null;
      //logger.trace(JSON.stringify(viewpoints));

      for(var i=0, viewpoint; viewpoint = viewpoints[i]; i++)
        result[viewpoint.id] = viewpoint.name;
    }catch(e){
      logger.fatal(e.message);
      logger.error(this.user);
    }
    //logger.trace(result);
    MemCache.viewpoints = result;
    return result;
  },
  getViewpointLocation: function(viewpointID, server){
    var logger = Log4Moz.repository.getLogger("lasuli.hypertopic.getViewpointLocation");
    //logger.trace(this._locations);
    //logger.trace(viewpointID);
    //logger.trace(server);
    if(this._locations[viewpointID])
      return this._locations[viewpointID];
    var viewpoint;
    try{
      viewpoint = HtServers[server].getViewpoint(viewpointID).getView();
    }catch(e){
      logger.fatal(e.message);
      logger.error(viewpointID);
    }

    if(server == "freecoding" && !viewpoint)
    {
      this._locations[viewpointID] = false;
      return false;
    }

    if(!viewpoint)
    {
      server = "freecoding";
      try{
        viewpoint = HtServers[server].getViewpoint(viewpointID).getView();
      }catch(e){
        logger.fatal(e.message);
        logger.error(viewpointID);
      }
      if(!viewpoint)
      {
        this._locations[viewpointID] = false;
        return false;
      }
    }
    this._locations[viewpointID] = server;
    //logger.trace(server);
    return server;
  },
  createViewpoint : function(viewpointName){
    var logger = Log4Moz.repository.getLogger("lasuli.hypertopic.createViewpoint");
    MemCache.viewpoints = false;
    if(!this.user)
      return false;

    try{
      var viewpoint = this.user.createViewpoint(viewpointName);
      if(viewpoint) return true;
    }catch(e){
      logger.fatal(e.message);
      logger.fatal(this.user);
      logger.fatal(viewpointName);
    }
    return false;
  },
  destroyViewpoint: function(viewpointID){
    var logger = Log4Moz.repository.getLogger("lasuli.hypertopic.destroyViewpoint");
    MemCache.viewpoints = false;
    //logger.trace(viewpointID);
    try{
      var viewpoint = HtServers.freecoding.getViewpoint(viewpointID);
      if(viewpoint.destroy())
        return true;
    }catch(e){
      logger.fatal(e.message);
      logger.fatal(viewpointID);
    }
    return false;
  },
  createItem : function(name){
    var logger = Log4Moz.repository.getLogger("lasuli.hypertopic.createItem");
    name = name || _("no.name");
    
    logger.debug("get item id");
    var itemID;
    for(var k in this.items) {
      itemID = this.items[k].getID();
      if (itemID) break;
    }

    try {
      var corpus = this.corpus;
      logger.debug(corpus);
      var item = corpus.createItem(name, itemID);
      if (item) {
        item.describe("resource", this.currentUrl);
        logger.debug(item.getObject());
        MemCache.items = false;
        return true;
      }
      logger.debug(item);
      return false;
    }catch(e){ logger.fatal(e.message); }
    return true;
  },
  createAttribute : function(attribute){
    var logger = Log4Moz.repository.getLogger("lasuli.hypertopic.createAttribute");
    MemCache.attributes = false;
    MemCache.items = false;
    //logger.trace(attribute);
    if(!this.item)
      this.createItem(name);
    try{
      var result = this.item.describe(attribute.name, attribute.value);
      if(result) return true;
    }catch(e){
      logger.fatal(e.message);
      logger.error(this.item);
      logger.error(attribute);
    }
    return false;
  },
  destroyAttribute : function(attribute){
    var logger = Log4Moz.repository.getLogger("lasuli.hypertopic.destroyAttribute");
    MemCache.attributes = false;
    MemCache.items = false;
    for (var i of Iterator(this.items)) {
      var item = i[1];
      try{
        item.undescribe(attribute.name, attribute.value);
      }
      catch(e){
        logger.fatal(e.message);
        logger.error(item.getRaw());
      }
    }
  },
  createKeyword : function(viewpointID, topicID, name){
    var logger = Log4Moz.repository.getLogger("lasuli.hypertopic.createKeyword");
    MemCache = {};
    if(!this.item)
      this.createItem(name);
    try{
      var topic = this.viewpoint.getTopic(topicID);
      var result = this.item.tag(topic);
      if(result)
        return true;
    }catch(e){
      logger.fatal(e.message);
      logger.error(viewpointID);
      logger.error(topicID);
      logger.error(name);
    }
    return false;
  },
  destroyKeyword : function(keyword, destroyTopic){
    var logger = Log4Moz.repository.getLogger("lasuli.hypertopic.destroyKeyword");
    MemCache = {};
    if(!this.viewpoint) return false;
    try{
      var topic = this.viewpoint.getTopic(keyword.topicID);
      if(!this.item.untag(topic))
        return false;
      else
      {
        if(typeof(destroyTopic) == "boolean" && destroyTopic)
        {
          topic.destroy();
          return true;
        }
        else
        {
          var color = getColor(keyword.topicID);
          keyword.color = color;
          return keyword;
        }
      }
    }catch(e){
      logger.fatal(e.message);
      logger.error(keyword);
    }
  },
  renameKeyword : function(keyword){
    var logger = Log4Moz.repository.getLogger("lasuli.hypertopic.renameKeyword");
    MemCache = {};
    if(!this.viewpoint) return false;
    try{
      var topic = this.viewpoint.getTopic(keyword.topicID);
      return topic.rename(keyword.newName);
    }catch(e){
      logger.fatal(e.message);
      logger.error(keyword);
    }
  },
  createAnalysis : function(viewpointID, topicID, topicName){
    var logger = Log4Moz.repository.getLogger("lasuli.hypertopic.createAnalysis");
    var topicIDs = (topicID) ? new Array(topicID) : null;
    topicName = (topicName) ? topicName : _("no.name");
    //logger.trace(topicIDs);
    try{
      var topic = this.viewpoint.createTopic(topicIDs, topicName);
      if(!topic)
        return false;
      var color = getColor(topic.getID());
      MemCache = {};
      return {"viewpointID": viewpointID, "topicID": topic.getID(), "name": topicName, "color": color};
    }catch(e){
      logger.fatal(e.message);
      logger.error(viewpointID);
      logger.error(topicID);
      logger.error(topicName);
    }
    return false;
  },
  //Return the fragment IDs which should be removed.
  destroyAnalysis: function(viewpointID, topicID, name){
    var logger = Log4Moz.repository.getLogger("lasuli.hypertopic.destroyAnalysis");

    if(!this.viewpoint) return false;
    var fragmentIDs = new Array();
    try{
      var topic = this.viewpoint.getTopic(topicID);
      for (var f of Iterator(this.docFragments)) {
        var fragment = f[1];
        if(topicID == fragment.topic.getID())
          try{
            if(fragment.destroy())
              fragmentIDs.push(fragment.getID());
          }catch(e){
            logger.fatal(e.message);
            logger.error(fragment.getObject());
          }
      }
      var result = topic.destroy();
      if(result)
      {
        MemCache = {};
        return fragmentIDs;
      }
    }catch(e){
      logger.fatal(e.message);
    }
    MemCache = {};
    return false;
  },
  renameAnalysis : function(viewpointID, topicID, name, newName){
    var logger = Log4Moz.repository.getLogger("lasuli.hypertopic.renameAnalysis");
    MemCache = {};
    if(!this.viewpoint) return false;
    try{
      var topic = this.viewpoint.getTopic(topicID);
      return topic.rename(newName);
    }catch(e){
      logger.fatal(e.message);
    }
  },
  renameViewpoint : function(viewpointID,name){
    var logger = Log4Moz.repository.getLogger("lasuli.hypertopic.renameViewpoint");
    MemCache = {};
    if(!this.viewpoint) return false;
    try{
      return this.viewpoint.rename(name);
    }catch(e){ logger.fatal(e.message); }
  },
  getViewpointsByTopicName : function(topicName){
    var logger = Log4Moz.repository.getLogger("lasuli.hypertopic.getViewpointsByTopicName");
    var viewpoints = new Array();
    try{
      for (var t of Iterator(this.docTopics)) {
        var topic = t[1];
        if(topicName == topic.getName())
          viewpoints.push({"id": topic.getViewpointID(), "name": topic.Viewpoint.getName()});
      }
    }catch(e){ logger.fatal(e.message); }
    try{
      for (var t of Iterator(this.docKeywords)) {
        var topic = t[1];
        if(topicName == topic.getName())
          viewpoints.push({"id": topic.getViewpointID(), "name": topic.Viewpoint.getName()});
      }
    }catch(e){ logger.fatal(e.message); }
    //logger.trace(viewpoints);
    return viewpoints;
  },
  getViewpointsByUser : function(userID){
    var logger = Log4Moz.repository.getLogger("lasuli.hypertopic.getViewpointsByUser");
    //logger.trace(userID);
    var viewpointIDs = new Array();
    var result = new Array();
    try{
      for (var t of Iterator(this.docTopics)) {
        var topic = t[1];
        if(viewpointIDs.indexOf(topic.getViewpointID()) < 0)
        {
          viewpointIDs.push(topic.getViewpointID());
          //logger.trace(viewpointIDs);
          var users = topic.Viewpoint.listUsers();
          //logger.trace(users);
          if(users.indexOf(userID) >= 0)
            result.push({"id": topic.getViewpointID(), "name": topic.Viewpoint.getName()});
        }
      }
    }catch(e){ logger.fatal(e.message); }
    try{
      for (var t of Iterator(this.docKeywords)) {
        var topic = t[1];
        if(viewpointIDs.indexOf(topic.getViewpointID()) < 0)
        {
          viewpointIDs.push(topic.getViewpointID());
          var users = topic.Viewpoint.listUsers();
          if(users.indexOf(userID) >= 0)
            result.push({"id": topic.getViewpointID(), "name": topic.Viewpoint.getName()});
        }
      }
    }catch(e){ logger.fatal(e.message); }

    return result;
  },
  createFragment: function(topicID, text, coordinates){
    var logger = Log4Moz.repository.getLogger("lasuli.hypertopic.createFragment");
    //logger.trace(coordinates);
    //logger.trace(topicID);
    //logger.trace(text);
    if(!this.item)
      this.createItem();

    var analysisTopic;

    if(!topicID)
      try{
        analysisTopic = this.createAnalysis(this.viewpointID);
        topicID = analysisTopic.topicID;
        createNewTopic = true;
      }catch(e){
        logger.fatal(e.message);
        return false;
      }
    try{
      var topic = this.viewpoint.getTopic(topicID);
      //logger.trace(topic);
      if(!topic) return false;
      var fragment = this.item.createHighlight(topic, text, coordinates);
      fragment.topic = topic;
      //logger.trace(fragment);
    }catch(e){
      logger.fatal(e.message);
    }
    MemCache = {};
    if(analysisTopic)
      return {"topic": analysisTopic, "fragment": fragment};
    else
      return {"fragment": fragment};
  },
  destroyFragment: function(fragmentID){
    var logger = Log4Moz.repository.getLogger("lasuli.hypertopic.destroyFragment");

    //logger.trace(fragmentID);
    var result = false;
    if(this.docFragments[fragmentID])
      try{
        result = this.docFragments[fragmentID].destroy();
        if(result)
          delete this.docFragments[fragmentID];
      }catch(e){ logger.fatal(e.message); }
    MemCache = {};
    return result;
  },
  moveFragment : function(fragmentID, targetTopicID){
    var logger = Log4Moz.repository.getLogger("lasuli.hypertopic.moveFragment");
    //logger.trace(fragmentID);
    //logger.trace(targetTopicID);
    if(!this.docFragments[fragmentID]) return false;
    try{
      var result = this.docFragments[fragmentID].moveToTopic(targetTopicID);
      if(result)
      {
        MemCache = {};
        return true;
      }
    }catch(e){
      logger.fatal(e.message);
      logger.error(fragmentID);
      logger.error(targetTopicID);
    }
    MemCache = {};
    return false;
  },
  moveTopic : function(viewpointID, narrowerTopicID, topicID){
    var logger = Log4Moz.repository.getLogger("lasuli.hypertopic.moveTopic");
    logger.trace(viewpointID);
    logger.trace(topicID);
    logger.trace(narrowerTopicID);
    var result = false;
    try{
      if(topicID) {
        var topic = this.viewpoint.getTopic(topicID);
        var narrowerTopic = this.viewpoint.getTopic(narrowerTopicID);
        logger.debug(topic);
        logger.debug(narrowerTopic);
        result = topic.moveTopics(narrowerTopic);
      }
      else {
        var narrowerTopic = this.viewpoint.getTopic(narrowerTopicID);
        result = narrowerTopic.unlink();
      }
      logger.debug(result);
      if(result)
      {
        MemCache = {};
        return true;
      }
    }catch(e){
      logger.fatal(e.message);
    }
    MemCache = {};
    return false;
  },
  /**
   * @return a list
   */
  getNarrowers : function(topic){
    var topics = new Array();
    var narrower = topic.getNarrower();
    if(!narrower || !(narrower.length > 0))
      return topics;

    for(var i=0, t; t = narrower[i]; i++)
      try{
        var obj = {};
        obj.data = t.getName() || "";
        var topicType = this.getTopicType(this.viewpointID, t.getID());
        obj.attr = {"viewpointID": this.viewpointID, "topicID": t.getID(), "name": obj.data + "", "rel": topicType};
        obj.children = this.getNarrowers(t);
        topics.push(obj);
      }catch(e){logger.fatal(e.message); }
    return topics;
  },
  getTopicType : function(viewpointID, topicID){
    if(topicID in this.docKeywords) return 'keyword';
    if(topicID in this.docTopics) return 'analysis';
    return 'topic';
  },
  get topicTree(){
    var logger = Log4Moz.repository.getLogger("lasuli.hypertopic.getTopicTree");
    //logger.trace(this.viewpointID);
    var topics = {};

    if(!this.viewpoint) return topics;
    //logger.trace('put viewpoint as the root topic');

    topics.data = new Array();
    var root = {};
    try{
      root.data = this.viewpoint.getName();
      root.attr = {"viewpointID": this.viewpointID, "name": root.data + "", "rel": "viewpoint"};
      root.children = new Array();
      root.state = 'open';
    }catch(e){ logger.fatal(e.message); }

    try{
      var upper = this.viewpoint.getUpperTopics();
      if(!upper) {
        //logger.trace('has no topic');
        topics.data.push(root);
        //logger.trace(topics);
        return topics;
      }

      for(var i=0, topic; topic = upper[i]; i++)
      {
        var obj = {};
        obj.data = topic.getName() || "";
        var topicType = this.getTopicType(this.viewpointID, topic.getID());
        obj.attr = {"viewpointID": this.viewpointID, "topicID": topic.getID(), "name": obj.data + "", "rel": topicType};
        obj.children = this.getNarrowers(topic);
        root.children.push(obj);
      }
    }catch(e){logger.fatal(e.message); }
    topics.data.push(root);
    return topics;
  }
}
