include("resource://lasuli/modules/HypertopicMap.js");
var MemCache = {};

lasuli.hypertopic = {
  _locations : {},

  get currentUrl(){
    return this._currentUrl;
  },
  set currentUrl(url){
    var logger = Log4Moz.repository.getLogger("lasuli.hypertopic.currentUrl");
    logger.trace(url);
    this._currentUrl = url;
    //this._locations = {};
    this._viewpointID = null;
    //logger.debug(MemCache);
    MemCache = {};
    if(url == "about:blank") return false;
  },
  get viewpoint(){
    var logger = Log4Moz.repository.getLogger("lasuli.hypertopic.viewpoint");
    var k = (this._locations[this.viewpointID]) ? this._locations[this.viewpointID] : "freecoding";
    logger.trace(k);
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
  get users(){
    if(MemCache.users) return MemCache.users;
    var logger = Log4Moz.repository.getLogger("lasuli.hypertopic.users");
    var result = {};
    for(var key in HtServers)
    {
      try{
        var user = HtServers[key].getUser();
        logger.trace(user);
        if(user)
        {
          logger.trace(user.getObject());
          result[key] = user;
        }
      }catch(e){ logger.fatal(e); }
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
    var logger = Log4Moz.repository.getLogger("lasuli.hypertopic.corpus");
    var result = null;
    var corpora;
    try{
      corpora = this.user.listCorpora();
    }catch(e){ logger.fatal(e); }

    if(!corpora || corpora.length == 0){
      try{
        var corpusName = _("default.corpus.name", [this.user.getID()])
        var corpus = this.user.createCorpus(corpusName);
        if(corpus)
          result = corpus;
      }catch(e){ logger.fatal(e); }
    }
    else
      try{
        result = HtServers.freecoding.getCorpus(corpora[0].id);
      }catch(e){ logger.fatal(e); }
    return result;
  },
  get items(){
    if(MemCache.items) return MemCache.items;
    var logger = Log4Moz.repository.getLogger("lasuli.hypertopic.items");

    var item, items = {};
    //Load items from all Hypertopic server by using resource URL
    for(var k in HtServers)
    {
      try{
        item = HtServers[k].getItem(this.currentUrl);
        if(item)
          items[k] = item;
      }catch(e){
        logger.fatal(e);
        logger.error(k);
        logger.error(this.currentUrl);
      }
    }
    MemCache.items = items;
    return items;
  },
  get item(){
    //Get item from freecoding server
    var logger = Log4Moz.repository.getLogger("lasuli.hypertopic.item");
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
    MemCache.items = false;
    try{
      if(!this.item)
        this.createItem(name);
      return this.item.rename(name);
    }catch(e){
      logger.fatal(e);
      logger.error(name);
      return false;
    }
  },
  get attributes(){
    if(MemCache.attributes) return MemCache.attributes;
    var logger = Log4Moz.repository.getLogger("lasuli.hypertopic.attributes");

    var result,attributes = {};
    for(var k in this.items)
    {
      try{
        var item = this.items[k];
        result = item.getAttributes();
      if(result)
        attributes[k] = result;
      }catch(e){
        logger.fatal(e);
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
        result[attribute.name].push(attribute.value);
      }
    logger.trace(result);
    MemCache.attributes = result;
    return result;
  },
  get docUsers(){
    if(MemCache.docUsers) return MemCache.docUsers;
    var logger = Log4Moz.repository.getLogger("lasuli.hypertopic.docUsers");
    var result = new Array();
    //Try to get all viewpoint from topics and keywords
    var viewpoints = {};
    var startTime = new Date().getTime();
    try{
      var docTopics = this.docTopics;
      var docKeywords = this.docKeywords;
      startTime = new Date().getTime();
      for each(var topic in docTopics)
      {
        var viewpointID = topic.getViewpointID();
        if(!(viewpointID in viewpoints) && topic.Viewpoint)
          viewpoints[viewpointID] = topic.Viewpoint;
      }
      for each(var topic in docKeywords)
      {
        var viewpointID = topic.getViewpointID();
        if(!(viewpointID in viewpoints) && topic.Viewpoint)
          viewpoints[viewpointID] = topic.Viewpoint;
      }
      logger.trace(viewpoints);
    }catch(e){ logger.fatal(e); }
    //Get all users from the viewpoints
    try{
      for each(var viewpoint in viewpoints)
      {
        var users = viewpoint.listUsers();
        if(users)
          for(var i=0, user; user = users[i]; i++)
            if(result.indexOf(user) < 0)
              result.push(user);
      }
    }catch(e){ logger.fatal(e); }
    logger.trace(result);
    MemCache.docUsers = result;
    logger.debug("Execution time: " + ((new Date().getTime()) - startTime) + "ms");
    return result;
  },
  get docFragments(){
    if(MemCache.docFragments) return MemCache.docFragments;
    var logger = Log4Moz.repository.getLogger("lasuli.hypertopic.docFragments");
    var startTime = new Date().getTime();
    var result = {};
    try{
      for(var k in this.items){
        var item = this.items[k];
        var fragments = item.getHighlights();
        for(var j=0, fragment; fragment = fragments[j]; j++){
          this._locations[fragment.getID()] = k;
          result[fragment.getID()] = fragment;
          var topic = fragment.getTopic();
          //Find out which server the viewpoint is located.
          var server = this.getViewpointLocation(topic.viewpoint, k);
          if(!server) continue;
          topic = HtServers[server].getTopic(topic);
          fragment.topic = topic;
        }
      }
    }catch(e){ logger.fatal(e); }
    logger.debug("Execution time: " + ((new Date().getTime()) - startTime) + "ms");
    MemCache.docFragments = result;
    return result;
  },
  get docKeywords(){
    if(MemCache.docKeywords) return MemCache.docKeywords;
    var startTime = new Date().getTime();
    var logger = Log4Moz.repository.getLogger("lasuli.hypertopic.docKeywords");

    var docKeywords = {};
    try{
      for each(var item in this.items){
        logger.trace(item.getObject());
        var topics = item.getTopics();
        if(topics)
        {
          logger.trace(topics);
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
    }catch(e){ logger.fatal(e); }
    logger.trace(docKeywords);
    MemCache.docKeywords = docKeywords;
    logger.debug("Execution time: " + ((new Date().getTime()) - startTime) + "ms");
    return docKeywords;
  },
  get docTopics(){
    if(MemCache.docTopics) return MemCache.docTopics;
    var startTime = new Date().getTime();
    var logger = Log4Moz.repository.getLogger("lasuli.hypertopic.docTopics");
    var docTopics = {};
    try{
      var docFragments = this.docFragments;
      var startTime = new Date().getTime();
      for each(var fragment in docFragments){
        var topic = fragment.topic;
        logger.trace(topic);
        var topicID = topic.getID();
        if(topicID in docTopics)
          docTopics[topicID].count++;
        else
        {
          docTopics[topicID] = topic;
          docTopics[topicID].count = 1;
        }
      }
    }catch(e){ logger.fatal(e); }
    logger.trace(docTopics);
    MemCache.docTopics = docTopics;
    logger.debug("Execution time: " + ((new Date().getTime()) - startTime) + "ms");
    return docTopics;
  },
  get docTags(){
    if(MemCache.docTags) return MemCache.docTags;
    var startTime = new Date().getTime();
    var logger = Log4Moz.repository.getLogger("lasuli.hypertopic.docTags");

    var result = {};
    try{
      for each(var topic in this.docTopics)
      {
        logger.trace("topic");
        logger.trace(topic.getObject());
        var topicName = topic.getName();
        logger.trace(topicName);
        if(topicName)
          if(topicName in result)
            result[topicName].size++;
          else
            result[topicName] = {"size": topic.count};
      }
      logger.trace(result);
      for each(var topic in this.docKeywords)
      {
        var topicName = topic.getName();
        if(topicName)
          if(topicName in result)
            result[topicName].size++;
          else
            result[topicName] = {"size": topic.count};
      }
    }catch(e){ logger.fatal(e); }
    logger.trace(result);
    MemCache.docTags = result;
    logger.debug("Execution time: " + ((new Date().getTime()) - startTime) + "ms");
    return result;
  },
  get docCoordinates(){
    if(MemCache.docCoordinates) return MemCache.docCoordinates;
    var startTime = new Date().getTime();
    var logger = Log4Moz.repository.getLogger("lasuli.hypertopic.docCoordinates");

    var result = {};
    try{
      for each(var fragment in this.docFragments){
        var coordinate = fragment.getCoordinates();
        logger.trace({ "startPos": coordinate[0], "endPos": coordinate[1]});
        result[fragment.getID()]={ "startPos": coordinate[0], "endPos": coordinate[1]};
      }
    }catch(e){ logger.fatal(e); }
    logger.trace(result);
    MemCache.docCoordinates = result;
    logger.debug("Execution time: " + ((new Date().getTime()) - startTime) + "ms");
    return result;
  },
  get topics(){
    if(MemCache.topics) return MemCache.topics;
    var logger = Log4Moz.repository.getLogger("lasuli.hypertopic.topics");
    var topics, result = {};
    try{
      topics = this.viewpoint.getTopics();
    }catch(e){ logger.fatal(e); }
    for(var i=0, topic; topic = topics[i]; i++)
      try{
        if(!(topic.getID() in this.keywords))
        {
            var topicName = topic.getName();
            if(!topicName) continue;
            result[topic.getID()] =  {"topicID": topic.getID(), "viewpointID": this.viewpointID, "name": topicName};
        }
      }catch(e){
        logger.fatal(e);
        logger.error(topic);
      }

    for(var topicID in result)
      result[topicID].color = getColor(topicID);
    logger.trace(result);
    MemCache.topics = result;
    return result;
  },
  get keywords(){
    if(MemCache.keywords) return MemCache.keywords;
    var logger = Log4Moz.repository.getLogger("lasuli.hypertopic.keywords");

    var result = {};
    logger.trace("viewpoint keywords");
    for each(var topic in this.docKeywords)
      try{
        if(topic.getViewpointID() == this.viewpointID)
        {
          var topicName = topic.getName();
          if(!topicName) continue;
          result[topic.getID()] = {"topicID": topic.getID(), "viewpointID": this.viewpointID, "name": topicName};
        }
      }catch(e){
        logger.fatal(e);
        logger.error(topic);
      }
    logger.trace(result);
    MemCache.keywords = result;
    return result;
  },
  get fragments(){
    if(MemCache.fragments) return MemCache.fragments;
    var logger = Log4Moz.repository.getLogger("lasuli.hypertopic.fragments");
    var result = {};
    for each(var fragment in this.docFragments)
      try{
        var topic = fragment.topic;
        if(topic.getViewpointID() == this.viewpointID)
          result[fragment.getID()] = fragment;
      }catch(e){
        logger.fatal(e);
        logger.error(topic);
      }
    logger.trace(result);
    MemCache.fragments = result;
    return result;
  },
  get coordinates(){
    if(MemCache.coordinates) return MemCache.coordinates;
    var logger = Log4Moz.repository.getLogger("lasuli.hypertopic.coordinates");
    var coordinate, topicID, result = {};

    for each(var fragment in this.fragments)
      try{
        coordinate = fragment.getCoordinates();
        topicID = fragment.topic.getID();
        logger.trace(topicID);
        if(!this.topics[topicID]) continue;
        var color = getColor(topicID);
        logger.trace(color);
        result[fragment.getID()]={ "startPos": coordinate[0], "endPos": coordinate[1], "color": color};
      }catch(e){
        logger.fatal(e);
        logger.error(fragment);
      }
    logger.trace(result);
    MemCache.coordinates = result;
    return result;
  },
  get viewpoints(){
    if(MemCache.viewpoints) return MemCache.viewpoints;
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
      logger.trace(JSON.stringify(viewpoints));

      for(var i=0, viewpoint; viewpoint = viewpoints[i]; i++)
        result[viewpoint.id] = viewpoint.name;
    }catch(e){
      logger.fatal(e);
      logger.error(this.user);
    }
    logger.trace(result);
    MemCache.viewpoints = result;
    return result;
  },
  getViewpointLocation: function(viewpointID, server){
    var logger = Log4Moz.repository.getLogger("lasuli.hypertopic.getViewpointLocation");
    logger.trace(this._locations);
    logger.trace(viewpointID);
    logger.trace(server);
    if(this._locations[viewpointID])
      return this._locations[viewpointID];
    var viewpoint;
    try{
      viewpoint = HtServers[server].getViewpoint(viewpointID).getView();
    }catch(e){
      logger.fatal(e);
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
        logger.fatal(e);
        logger.error(viewpointID);
      }
      if(!viewpoint)
      {
        this._locations[viewpointID] = false;
        return false;
      }
    }
    this._locations[viewpointID] = server;
    logger.trace(server);
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
      logger.fatal(e);
      logger.fatal(this.user);
      logger.fatal(viewpointName);
    }
    return false;
  },
  destroyViewpoint: function(viewpointID){
    var logger = Log4Moz.repository.getLogger("lasuli.hypertopic.destroyViewpoint");
    MemCache.viewpoints = false;
    logger.trace(viewpointID);
    try{
      var viewpoint = HtServers.freecoding.getViewpoint(viewpointID);
      if(viewpoint.destroy())
        return true;
    }catch(e){
      logger.fatal(e);
      logger.fatal(viewpointID);
    }
    return false;
  },
  createItem : function(name){
    var logger = Log4Moz.repository.getLogger("lasuli.hypertopic.createItem");
    MemCache.items = false;
    name = name || _("no.name");
    try{
      logger.trace(this.corpus);
      var item = this.corpus.createItem(name);
      if(item)
      {
        item.describe("resource", this.currentUrl);
        logger.trace(item.getObject());
        return true;
      }
      logger.error(item);
      return false;
    }catch(e){ logger.fatal(e); }
    return true;
  },
  createAttribute : function(attribute){
    var logger = Log4Moz.repository.getLogger("lasuli.hypertopic.createAttribute");
    MemCache.attributes = false;
    MemCache.items = false;
    logger.trace(attribute);
    if(!this.item)
      this.createItem(name);
    try{
      var result = this.item.describe(attribute.name, attribute.value);
      if(result) return true;
    }catch(e){
      logger.fatal(e);
      logger.error(this.item);
      logger.error(attribute);
    }
    return false;
  },
  destroyAttribute : function(attribute){
    var logger = Log4Moz.repository.getLogger("lasuli.hypertopic.destroyAttribute");
    MemCache.attributes = false;
    MemCache.items = false;
    for each(var item in this.items)
      try{
        item.undescribe(attribute.name, attribute.value);
      }
      catch(e){
        logger.fatal(e);
        logger.error(item.getRaw());
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
      logger.fatal(e);
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
      logger.fatal(e);
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
      logger.fatal(e);
      logger.error(keyword);
    }
  },
  createAnalysis : function(viewpointID, topicID, topicName){
    var logger = Log4Moz.repository.getLogger("lasuli.hypertopic.createAnalysis");
    var topicIDs = (topicID) ? new Array(topicID) : null;
    topicName = (topicName) ? topicName : _("no.name");
    logger.trace(topicIDs);
    try{
      var topic = this.viewpoint.createTopic(topicIDs, topicName);
      if(!topic)
        return false;
      var color = getColor(topic.getID());
      MemCache = {};
      return {"viewpointID": viewpointID, "topicID": topic.getID(), "name": topicName, "color": color};
    }catch(e){
      logger.fatal(e);
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
      for each(var fragment in this.docFragments)
        if(topicID == fragment.topic.getID())
          try{
            if(fragment.destroy())
              fragmentIDs.push(fragment.getID());
          }catch(e){
            logger.fatal(e);
            logger.error(fragment.getObject());
          }

      var result = topic.destroy();
      if(result)
      {
        MemCache = {};
        return fragmentIDs;
      }
    }catch(e){
      logger.fatal(e);
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
      logger.fatal(e);
    }
  },
  renameViewpoint : function(viewpointID,name){
    var logger = Log4Moz.repository.getLogger("lasuli.hypertopic.renameViewpoint");
    MemCache = {};
    if(!this.viewpoint) return false;
    try{
      return this.viewpoint.rename(name);
    }catch(e){ logger.fatal(e); }
  },
  getViewpointsByTopicName : function(topicName){
    var logger = Log4Moz.repository.getLogger("lasuli.hypertopic.getViewpointsByTopicName");
    var viewpoints = new Array();
    try{
      for each(var topic in this.docTopics)
        if(topicName == topic.getName())
          viewpoints.push({"id": topic.getViewpointID(), "name": topic.Viewpoint.getName()});
    }catch(e){ logger.fatal(e); }
    try{
      for each(var topic in this.docKeywords)
        if(topicName == topic.getName())
          viewpoints.push({"id": topic.getViewpointID(), "name": topic.Viewpoint.getName()});
    }catch(e){ logger.fatal(e); }
    logger.trace(viewpoints);
    return viewpoints;
  },
  getViewpointsByUser : function(userID){
    var logger = Log4Moz.repository.getLogger("lasuli.hypertopic.getViewpointsByUser");
    logger.trace(userID);
    var viewpointIDs = new Array();
    var result = new Array();
    try{
      for each(var topic in this.docTopics)
      {
        logger.trace(topic.getViewpointID());
        if(viewpointIDs.indexOf(topic.getViewpointID()) < 0)
        {
          viewpointIDs.push(topic.getViewpointID());
          logger.trace(viewpointIDs);
          var users = topic.Viewpoint.listUsers();
          logger.trace(users);
          if(users.indexOf(userID) >= 0)
            result.push({"id": topic.getViewpointID(), "name": topic.Viewpoint.getName()});
        }
      }
    }catch(e){ logger.fatal(e); }
    try{
      for each(var topic in this.docKeywords)
        if(viewpointIDs.indexOf(topic.getViewpointID()) < 0)
        {
          viewpointIDs.push(topic.getViewpointID());
          var users = topic.Viewpoint.listUsers();
          if(users.indexOf(userID) >= 0)
            result.push({"id": topic.getViewpointID(), "name": topic.Viewpoint.getName()});
        }
    }catch(e){ logger.fatal(e); }

    return result;
  },
  createFragment: function(topicID, text, coordinates){
    var logger = Log4Moz.repository.getLogger("lasuli.hypertopic.createFragment");
    logger.trace(coordinates);
    logger.trace(topicID);
    logger.trace(text);
    if(!this.item)
      this.createItem();

    var analysisTopic;

    if(!topicID)
      try{
        analysisTopic = this.createAnalysis(this.viewpointID);
        topicID = analysisTopic.topicID;
        createNewTopic = true;
      }catch(e){
        logger.fatal(e);
        return false;
      }
    try{
      var topic = this.viewpoint.getTopic(topicID);
      logger.trace(topic);
      if(!topic) return false;
      var fragment = this.item.createHighlight(topic, text, coordinates);
      fragment.topic = topic;
      logger.trace(fragment);
    }catch(e){
      logger.fatal(e);
    }
    MemCache = {};
    if(analysisTopic)
      return {"topic": analysisTopic, "fragment": fragment};
    else
      return {"fragment": fragment};
  },
  destroyFragment: function(fragmentID){
    var logger = Log4Moz.repository.getLogger("lasuli.hypertopic.destroyFragment");

    logger.trace(fragmentID);
    var result = false;
    if(this.docFragments[fragmentID])
      try{
        result = this.docFragments[fragmentID].destroy();
        if(result)
          delete this.docFragments[fragmentID];
      }catch(e){ logger.fatal(e); }
    MemCache = {};
    return result;
  },
  moveFragment : function(fragmentID, targetTopicID){
    var logger = Log4Moz.repository.getLogger("lasuli.hypertopic.moveFragment");
    logger.trace(fragmentID);
    logger.trace(targetTopicID);
    if(!this.docFragments[fragmentID]) return false;
    try{
      var result = this.docFragments[fragmentID].moveToTopic(targetTopicID);
      if(result)
      {
        MemCache = {};
        return true;
      }
    }catch(e){
      logger.fatal(e);
      logger.error(fragmentID);
      logger.error(targetTopicID);
    }
    MemCache = {};
    return false;
  },
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
      }catch(e){logger.fatal(e); }
    return topics;
  },
  getTopicType : function(viewpointID, topicID){
    if(topicID in this.docKeywords) return 'keyword';
    if(topicID in this.docTopics) return 'analysis';
    return 'topic';
  },
  get topicTree(){
    var logger = Log4Moz.repository.getLogger("lasuli.hypertopic.getTopicTree");
    logger.trace(this.viewpointID);
    var topics = {};

    if(!this.viewpoint) return topics;
    logger.trace('put viewpoint as the root topic');

    topics.data = new Array();
    var root = {};
    try{
      root.data = this.viewpoint.getName();
      root.attr = {"viewpointID": this.viewpointID, "name": root.data + "", "rel": "viewpoint"};
      root.children = new Array();
      root.state = 'open';
    }catch(e){ logger.fatal(e); }

    try{
      var upper = this.viewpoint.getUpperTopics();
      if(!upper) {
        logger.trace('has no topic');
        topics.data.push(root);
        logger.trace(topics);
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
    }catch(e){logger.fatal(e); }
    topics.data.push(root);
    return topics;
  }
}