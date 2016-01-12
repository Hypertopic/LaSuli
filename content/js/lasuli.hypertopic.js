include("resource://lasuli/modules/HypertopicMap.js");

var MemCache = {};
var enableCache = require('sdk/preferences/service').get("extensions.lasuli.cache") || true;

lasuli.hypertopic = {
  _locations : {},

  get currentUrl(){
    return this._currentUrl;
  },
  set currentUrl(url){
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
    var result = {};
    for(var key in HtServers)
    {
      try{
        var user = HtServers[key].getUser();
        if(user)
        {
          result[key] = user;
        }
      } catch(e) {
        console.error(e);
      }
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
    var result = null, corpusID;
    for(var k in this.items) {
      corpusID = this.items[k].getCorpusID();
      if (corpusID) break;
    }
    if(corpusID) {
      // Corpus found
      var corpus = HtServers.freecoding.getCorpus(corpusID);
      if(corpus.getView() === false) {
        // but not its duplicate on the default server
        var ret = corpus.createWithID(corpusID, corpusID);
        if(!ret) {
          console.error('unable to create a corpus with a specific ID:' + corpusID);
          return false;
        }
        return ret;
      }
      return corpus;
    }
    // No corpus found! Need to use user's corpus!
    var corpora,
        user = this.user;
    try{
      if(user)
        corpora = user.listCorpora();
    } catch(e) {
      console.error(e);
    }
    if(!corpora || corpora.length == 0){
      try{
        // Try to create a new corpus
        var corpusName = _("default.corpus.name", [user.getID()]);

        var corpus = user.createCorpus(corpusName);
        if(corpus)
          result = corpus;
      } catch(e) {
        console.error(e);
      }
    }
    else
      try{
        result = HtServers.freecoding.getCorpus(corpora[0].id);
      } catch(e) {
        console.error(e);
      }
    MemCache.corpus = result;
    return result;
  },
  /**
   * @return a map
   */
  get items(){
    if(enableCache && MemCache.items) return MemCache.items;
    console.time("lasuli.hypertopic.items");
    var item, items = {};
    //Load items from all Hypertopic server by using resource URL
    for(var k in HtServers)
    {
      try{
        item = HtServers[k].getItem(this.currentUrl);
        if(item)
          items[k] = item;
      }catch(e){
        console.error(e, k, this.currentUrl);
      }
    }
    MemCache.items = items;
    console.timeEnd("lasuli.hypertopic.items");
    return items;
  },
  get item(){
    //Get item from freecoding server
    if(!this.items || !this.items["freecoding"])
      return null;
    return this.items["freecoding"];
  },
  get itemName(){
    return (this.item) ? this.item.getName() : _("no.name");
  },
  set itemName(name){
    try{
      if(!this.item)
      {
        // Need to create a new item
        this.createItem(name);
        return true;
      }
      else
      {
        MemCache.items = false;
        return this.item.rename(name);
      }
    }catch(e){
      console.error(e, name);
      return false;
    }
  },
  /**
   * @return a map of attributes (each key may have a list of values)
   */
  get attributes(){
    if(enableCache && MemCache.attributes) return MemCache.attributes;
    var result,attributes = {};
    for(var k in this.items)
    {
      try{
        var item = this.items[k];
        result = item.getAttributes();
      if(result)
        attributes[k] = result;
      }catch(e){
        console.error(e, k, result);
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
    MemCache.attributes = result;
    return result;
  },
  /**
   * @return a list
   */
  get docUsers(){
    if(enableCache && MemCache.docUsers) return MemCache.docUsers;
    console.time("lasuli.hypertopic.docUsers");
    var result = new Array();
    //Try to get all viewpoint from topics and keywords
    var viewpoints = {};
    try{
      var docTopics = this.docTopics;
      var docKeywords = this.docKeywords;
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
    } catch(e) {
      console.error(e);
    }
    //Get all users from the viewpoints
    try{
      for (var viewpoint of Iterator(viewpoints)) {
        var users = viewpoint[1].listUsers();
        if(users)
          for(var i=0, user; user = users[i]; i++)
            if(result.indexOf(user) < 0)
              result.push(user);
      }
    } catch(e) {
      console.error(e);
    }
    MemCache.docUsers = result;
    console.timeEnd("lasuli.hypertopic.docUsers");
    return result;
  },
  /**
   * @return a map
   */
  get docFragments(){
    if(enableCache && MemCache.docFragments) return MemCache.docFragments;
    console.time("lasuli.hypertopic.docFragments");
    var result = {};
    try{
      var items = this.items;
      var topics = {};
      for(var k in items){
        var item = items[k];
        var fragments = item.getHighlights();
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
    } catch(e) {
      console.error(e);
    }
    console.timeEnd("lasuli.hypertopic.docFragments");
    MemCache.docFragments = result;
    return result;
  },
  /**
   * @return a map
   */
  get docKeywords(){
    if(enableCache && MemCache.docKeywords) return MemCache.docKeywords;
    console.time("lasuli.hypertopic.docKeywords");
    var docKeywords = {};
    try{
      var items = this.items;
      for (var item of Iterator(items)) {
        var topics = item[1].getTopics();
        if(topics)
        {
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
    } catch(e) {
      console.error(e);
    }
    MemCache.docKeywords = docKeywords;
    console.timeEnd("lasuli.hypertopic.docKeywords");
    return docKeywords;
  },
  /**
   * @return a map
   */
  get docTopics(){
    if(enableCache && MemCache.docTopics) return MemCache.docTopics;
    console.time("lasuli.hypertopic.docTopics");
    var docTopics = {};
    try{
      var docFragments = this.docFragments;
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
    } catch(e) {
      console.error(e);
    }
    MemCache.docTopics = docTopics;
    console.timeEnd("lasuli.hypertopic.docTopics");
    return docTopics;
  },
  /**
   * @return a map
   */
  get docTags(){
    if(enableCache && MemCache.docTags) return MemCache.docTags;
    console.time("lasuli.hypertopic.docTags");
    var result = {};
    try{
      for (var t of Iterator(this.docTopics)) {
        var topic = t[1];
        var topicName = topic.getName();
        if(topicName)
          if(topicName in result)
            result[topicName].size++;
          else
            result[topicName] = {"size": topic.count};
      }
      for (var t of Iterator(this.docKeywords)) {
        var topic = t[1];
        var topicName = topic.getName();
        if(topicName)
          if(topicName in result)
            result[topicName].size++;
          else
            result[topicName] = {"size": topic.count};
      }
    } catch(e) {
      console.error(e);
    }
    MemCache.docTags = result;
    console.timeEnd("lasuli.hypertopic.docTags");
    return result;
  },
  /**
   * @return a map
   */
  get docCoordinates(){
    if(enableCache && MemCache.docCoordinates) return MemCache.docCoordinates;
    console.time("lasuli.hypertopic.docCoordinates");
    var result = {};
    try{
      for (var f of Iterator(this.docFragments)) {
        var fragment = f[1];
        var coordinate = fragment.getCoordinates();
        result[fragment.getID()]={ "startPos": coordinate[0], "endPos": coordinate[1]};
      }
    } catch(e) {
      console.error(e);
    }
    MemCache.docCoordinates = result;
    console.timeEnd("lasuli.hypertopic.docCoordinates");
    return result;
  },
  /**
   * @return a map
   */
  get topics(){
    if(enableCache && MemCache.topics) return MemCache.topics;
    var topics, result = {};
    try{
      topics = this.viewpoint.getTopics();
    } catch(e) {
      console.error(e);
    }
    for(var i=0, topic; topic = topics[i]; i++)
      try{
        if(!(topic.getID() in this.keywords))
        {
            var topicName = topic.getName();
            if(!topicName) continue;
            result[topic.getID()] =  {"topicID": topic.getID(), "viewpointID": this.viewpointID, "name": topicName};
        }
      }catch(e){
        console.error(e, topic);
      }

    for(var topicID in result)
      result[topicID].color = getColor(topicID);
    MemCache.topics = result;
    return result;
  },
  /**
   * @return a map
   */
  get keywords(){
    if(enableCache && MemCache.keywords) return MemCache.keywords;
    var result = {};
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
        console.error(e, topic);
      }
    }
    MemCache.keywords = result;
    return result;
  },
  /**
   * @return a map
   */
  get fragments(){
    if(enableCache && MemCache.fragments) return MemCache.fragments;
    var result = {};
    for (var f of Iterator(this.docFragments)) {
      var fragment = f[1];
      try{
        var topic = fragment.topic;
        if(topic.getViewpointID() == this.viewpointID)
          result[fragment.getID()] = fragment;
      }catch(e){
        console.error(e, fragment);
      }
    }
    MemCache.fragments = result;
    return result;
  },
  /**
   * @return a map
   */
  get coordinates(){
    if(enableCache && MemCache.coordinates) return MemCache.coordinates;
    var coordinate, topicID, result = {};

    for (var f of Iterator(this.fragments)) {
      var fragment = f[1];
      try{
        coordinate = fragment.getCoordinates();
        topicID = fragment.topic.getID();
        if(!this.topics[topicID]) continue;
        var color = getColor(topicID);
        result[fragment.getID()]={ "startPos": coordinate[0], "endPos": coordinate[1], "color": color};
      }catch(e){
        console.error(e, fragment);
      }
    }
    MemCache.coordinates = result;
    return result;
  },
  /**
   * @return a map
   */
  get viewpoints(){
    if(enableCache && MemCache.viewpoints) return MemCache.viewpoints;
    var result = {};
    if(!this.user)
    {
      console.error("User {" + HtServers.freecoding.user + "} doesn't exist yet");
      return null;
    }
    try{
      var viewpoints = this.user.listViewpoints();
      if(!viewpoints) return null;
      for(var i=0, viewpoint; viewpoint = viewpoints[i]; i++)
        result[viewpoint.id] = viewpoint.name;
    }catch(e){
      console.error(e, this.user);
    }
    MemCache.viewpoints = result;
    return result;
  },
  getViewpointLocation: function(viewpointID, server){
    if(this._locations[viewpointID])
      return this._locations[viewpointID];
    var viewpoint;
    try{
      viewpoint = HtServers[server].getViewpoint(viewpointID).getView();
    }catch(e){
      console.error(e, viewpointID);
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
        console.error(e, viewpointID);
      }
      if(!viewpoint)
      {
        this._locations[viewpointID] = false;
        return false;
      }
    }
    this._locations[viewpointID] = server;
    return server;
  },
  createViewpoint : function(viewpointName){
    MemCache.viewpoints = false;
    if(!this.user)
      return false;

    try{
      var viewpoint = this.user.createViewpoint(viewpointName);
      if(viewpoint) return true;
    }catch(e){
      console.error(e, this.user, viewpointName);
    }
    return false;
  },
  destroyViewpoint: function(viewpointID){
    MemCache.viewpoints = false;
    try{
      var viewpoint = HtServers.freecoding.getViewpoint(viewpointID);
      if(viewpoint.destroy())
        return true;
    }catch(e){
      console.error(e, viewpointID);
    }
    return false;
  },
  createItem : function(name){
    name = name || _("no.name");
    
    // get item id
    var itemID;
    for(var k in this.items) {
      itemID = this.items[k].getID();
      if (itemID) break;
    }

    try {
      var corpus = this.corpus;
      var item = corpus.createItem(name, itemID);
      if (item) {
        item.describe("resource", this.currentUrl);
        MemCache.items = false;
        return true;
      }
      return false;
    } catch(e) {
      console.error(e);
    }
    return true;
  },
  createAttribute : function(attribute){
    MemCache.attributes = false;
    MemCache.items = false;
    if(!this.item)
      this.createItem(name);
    try{
      var result = this.item.describe(attribute.name, attribute.value);
      if(result) return true;
    }catch(e){
      console.error(e, this.item, attribute);
    }
    return false;
  },
  destroyAttribute : function(attribute){
    MemCache.attributes = false;
    MemCache.items = false;
    for (var i of Iterator(this.items)) {
      var item = i[1];
      try{
        item.undescribe(attribute.name, attribute.value);
      }
      catch(e){
        console.error(e, item.getRaw());
      }
    }
  },
  createKeyword : function(viewpointID, topicID, name){
    MemCache = {};
    if(!this.item)
      this.createItem(name);
    try{
      var topic = this.viewpoint.getTopic(topicID);
      var result = this.item.tag(topic);
      if(result)
        return true;
    }catch(e){
      console.error(e, viewpointID, topicID, name);
    }
    return false;
  },
  destroyKeyword : function(keyword, destroyTopic){
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
      console.error(e, keyword);
    }
  },
  renameKeyword : function(keyword){
    MemCache = {};
    if(!this.viewpoint) return false;
    try{
      var topic = this.viewpoint.getTopic(keyword.topicID);
      return topic.rename(keyword.newName);
    }catch(e){
      console.error(e, keyword);
    }
  },
  createAnalysis : function(viewpointID, topicID, topicName){
    var topicIDs = (topicID) ? new Array(topicID) : null;
    topicName = (topicName) ? topicName : _("no.name");
    try{
      var topic = this.viewpoint.createTopic(topicIDs, topicName);
      if(!topic)
        return false;
      var color = getColor(topic.getID());
      MemCache = {};
      return {"viewpointID": viewpointID, "topicID": topic.getID(), "name": topicName, "color": color};
    }catch(e){
      console.error(e, viewpointID, topicID, topicName);
    }
    return false;
  },
  //Return the fragment IDs which should be removed.
  destroyAnalysis: function(viewpointID, topicID, name){
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
            console.error(e, fragment.getObject());
          }
      }
      var result = topic.destroy();
      if(result)
      {
        MemCache = {};
        return fragmentIDs;
      }
    }catch(e){
      console.error(e);
    }
    MemCache = {};
    return false;
  },
  renameAnalysis : function(viewpointID, topicID, name, newName){
    MemCache = {};
    if(!this.viewpoint) return false;
    try{
      var topic = this.viewpoint.getTopic(topicID);
      return topic.rename(newName);
    }catch(e){
      console.error(e);
    }
  },
  renameViewpoint : function(viewpointID,name){
    MemCache = {};
    if(!this.viewpoint) return false;
    try{
      return this.viewpoint.rename(name);
    } catch(e){
      console.error(e);
    }
  },
  getViewpointsByTopicName : function(topicName){
    var viewpoints = new Array();
    try{
      for (var t of Iterator(this.docTopics)) {
        var topic = t[1];
        if(topicName == topic.getName())
          viewpoints.push({"id": topic.getViewpointID(), "name": topic.Viewpoint.getName()});
      }
    } catch(e) {
      console.error(e);
    }
    try{
      for (var t of Iterator(this.docKeywords)) {
        var topic = t[1];
        if(topicName == topic.getName())
          viewpoints.push({"id": topic.getViewpointID(), "name": topic.Viewpoint.getName()});
      }
    } catch(e) {
      console.error(e);
    }
    return viewpoints;
  },
  getViewpointsByUser : function(userID){
    var viewpointIDs = new Array();
    var result = new Array();
    try{
      for (var t of Iterator(this.docTopics)) {
        var topic = t[1];
        if(viewpointIDs.indexOf(topic.getViewpointID()) < 0)
        {
          viewpointIDs.push(topic.getViewpointID());
          var users = topic.Viewpoint.listUsers();
          if(users.indexOf(userID) >= 0)
            result.push({"id": topic.getViewpointID(), "name": topic.Viewpoint.getName()});
        }
      }
    } catch(e) {
      console.error(e);
    }
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
    } catch(e) {
      console.error(e);
    }
    return result;
  },
  createFragment: function(topicID, text, coordinates){
    if(!this.item)
      this.createItem();

    var analysisTopic;

    if(!topicID)
      try{
        analysisTopic = this.createAnalysis(this.viewpointID);
        topicID = analysisTopic.topicID;
        createNewTopic = true;
      }catch(e){
        console.error(e);
        return false;
      }
    try{
      var topic = this.viewpoint.getTopic(topicID);
      if(!topic) return false;
      var fragment = this.item.createHighlight(topic, text, coordinates);
      fragment.topic = topic;
    }catch(e){
      console.error(e);
    }
    MemCache = {};
    if(analysisTopic)
      return {"topic": analysisTopic, "fragment": fragment};
    else
      return {"fragment": fragment};
  },
  destroyFragment: function(fragmentID){
    var result = false;
    if(this.docFragments[fragmentID])
      try{
        result = this.docFragments[fragmentID].destroy();
        if(result)
          delete this.docFragments[fragmentID];
      } catch(e) {
        console.error(e);
      }
    MemCache = {};
    return result;
  },
  moveFragment : function(fragmentID, targetTopicID){
    if(!this.docFragments[fragmentID]) return false;
    try{
      var result = this.docFragments[fragmentID].moveToTopic(targetTopicID);
      if(result)
      {
        MemCache = {};
        return true;
      }
    }catch(e){
      console.error(e, fragmentID, targetTopicID);
    }
    MemCache = {};
    return false;
  },
  moveTopic : function(viewpointID, narrowerTopicID, topicID){
    var result = false;
    try{
      if(topicID) {
        var topic = this.viewpoint.getTopic(topicID);
        var narrowerTopic = this.viewpoint.getTopic(narrowerTopicID);
        result = topic.moveTopics(narrowerTopic);
      }
      else {
        var narrowerTopic = this.viewpoint.getTopic(narrowerTopicID);
        result = narrowerTopic.unlink();
      }
      if(result)
      {
        MemCache = {};
        return true;
      }
    }catch(e){
      console.error(e);
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
      } catch(e) {
        console.error(e);
      }
    return topics;
  },
  getTopicType : function(viewpointID, topicID){
    if(topicID in this.docKeywords) return 'keyword';
    if(topicID in this.docTopics) return 'analysis';
    return 'topic';
  },
  get topicTree(){
    var topics = {};

    if(!this.viewpoint) return topics;
    // Put viewpoint as the root topic
    topics.data = new Array();
    var root = {};
    try{
      root.data = this.viewpoint.getName();
      root.attr = {"viewpointID": this.viewpointID, "name": root.data + "", "rel": "viewpoint"};
      root.children = new Array();
      root.state = 'open';
    } catch(e) {
      console.error(e);
    }
    try{
      var upper = this.viewpoint.getUpperTopics();
      if(!upper) {
        // Has no topic
        topics.data.push(root);
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
    } catch(e) {
      console.error(e);
    }
    topics.data.push(root);
    return topics;
  }
}
