include("resource://lasuli/modules/HypertopicMap.js");

lasuli.hypertopic = {
  get currentUrl(){
    return this._currentUrl;
  },
  set currentUrl(url){
    var logger = Log4Moz.repository.getLogger("lasuli.hypertopic.currentUrl");
    logger.debug(url);
    this._attributes = null;
    this._corpus = null;
    this._currentUrl = url;
    this._viewpoints = null;
    this._items = null;
    this._users = null;
    this._item = null;

    this._itemID = null;
    this._corpusID = null;
    this._tags = null;
    this._fragments = null;
    this._keywords = null;
    this._viewpointID = null;
    if(url == "about:blank") return false;
  },

  //TODO
  get viewpointID(){
    return this._viewpointID;
  },
  set viewpointID(id){
    if(id != this._viewpointID)
    {
      this._viewpointID = id;
      this._topics = null;
      this._fragments = null;
      this._keywords = null;
    }
  },

  get users(){
    var logger = Log4Moz.repository.getLogger("lasuli.hypertopic.users");
    if(this._users) return this._users;

    this._users = {};
    for(var key in HtServers)
    {
      var user = HtServers[key].getUser();
      //logger.debug(user);
      if(user)
      {
        logger.debug(user.getObject());
        this._users[key] = user;
      }
    }
    return this._users;
  },
  set users(val){
    this._users = val;
  },

  get user(){
    if(this.users && this.users.freecoding)
      return this.users.freecoding;
    else
      return null;
  },

  get corpus(){
    var logger = Log4Moz.repository.getLogger("lasuli.hypertopic.corpus");
    if(this._corpus)
      return this._corpus;

    this._corpus = null;
    var corpora = this.user.listCorpora();
    if(!corpora || corpora.length == 0){
      var corpusName = _("default.corpus.name", [this.user.getID()])
      var corpus = this.user.createCorpus(corpusName);
      if(corpus)
        this._corpus = corpus;
    }
    else
      this._corpus = HtServers.freecoding.getCorpus(corpora[0].id);
    return this._corpus;
  },

  get items(){
    var logger = Log4Moz.repository.getLogger("lasuli.hypertopic.items");
    if(this._items)
      return this._items;
    this._items = {};
    //Load items from all Hypertopic server by using resource URL
    for(var key in HtServers)
    {
      //logger.debug(key);
      //logger.debug(HtServers[key].baseUrl);
      var item = HtServers[key].getItem(this.currentUrl);
      if(item)
      {
        //logger.debug(item.getObject());
        this._items[key] = item;
      }
    }
    return this._items;
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
    logger.debug(name);
    if(!this.item)
      this.createItem(name);
    return this.item.rename(name);
  },

  get attributes(){
    var logger = Log4Moz.repository.getLogger("lasuli.hypertopic.attributes");

    if(!this._attributes)
    {
      this._attributes = {};
      for(var k in this.items)
      {
        var item = this.items[k];
        var result = item.getAttributes();
        logger.debug(k);
        logger.debug(result);
        if(result)
          this._attributes[k] = result;
      }
    }
    //logger.debug("this._attributes");
    //logger.debug(this._attributes);
    var result = {};
    for(var k in this._attributes)
      for(var i=0, attribute; attribute = this._attributes[k][i]; i++)
      {
        if(!result[attribute.name])
          result[attribute.name] = new Array();
        result[attribute.name].push(attribute.value);
      }
    logger.debug(result);
    return result;
  },
  set attributes(param){
    this._attributes = param;
  },

  get docUsers(){
    var logger = Log4Moz.repository.getLogger("lasuli.hypertopic.docUsers");
    var result = new Array();
    for each(var item in this.items){
      logger.debug(item.Corpus.getObject());
      var users = item.Corpus.listUsers();
      logger.debug(users);
      for each(var user in users)
        if(result.indexOf(user) < 0)
          result.push(user);
    }
    logger.debug(result);
    return result;
  },

  get docKeywords(){
    var logger = Log4Moz.repository.getLogger("lasuli.hypertopic.docKeywords");
    var result = {};
    for each(var item in this.items){
      logger.debug(item.getObject());
      var topics = item.getTopics();
      logger.debug(topics);
      for(var j=0, topic; topic = topics[j]; j++)
      {
        if(!result[topic.getID()])
          result[topic.getID()] = new Array();
        result[topic.getID()].push(topic);
      }
    }
    return result;
  },

  get docTopics(){
    var logger = Log4Moz.repository.getLogger("lasuli.hypertopic.docTopics");
    var result = {};
    for each(var fragment in this.docFragments){
      logger.debug(fragment.getObject());
      var topic = fragment.getTopic();
      logger.debug(topic);
      result[topic.id] = topic;
    }
    return result;
  },

  get docFragments(){
    var logger = Log4Moz.repository.getLogger("lasuli.hypertopic.docFragments");
    var result = {};
    for each(var item in this.items){
      logger.debug(item.getObject());
      var fragments = item.getHighlights();
      logger.debug(fragments);
      for(var j=0, fragment; fragment = fragments[j]; j++)
        result[fragment.getID()] = fragment;
    }
    return result;
  },

  get docTags(){
    var result = {};
    for each(var topic in this.docTopics);
    {
      var topicID = topic.id;
      var viewpointID = topic.viewpoint;
      var topicName = topic.name;
      if(result[topicID])
      {
        if(!result[topicID].name)
          result[topicID].name = topicName;
        result[topicID].count++;
      }
      else
        result[topicID] = {"topic": topicID, "viewpoint": viewpointID, "count": 1, "name": topicName};
    }
    for each(var topics in this.docKeywords);
    {
      var topicID = topics[0].id;
      var viewpointID = topics[0].viewpoint;
      var topicName = topic.name;
      if(result[topicID])
      {
        if(!result[topicID].name)
          result[topicID].name = topicName;
        result[topicID].count++;
      }
      else
        result[topicID] = {"topic": topicID, "viewpoint": viewpointID, "count": 1, "name": topicName};
    }
    return result;
  },

  //TODO
  get topics(){
    var logger = Log4Moz.repository.getLogger("lasuli.hypertopic.topics");
    if(this._topics == null)
      this.getViewpoint();
    return this._topics;
  },

  //TODO
  get keywords(){

    if(this._keywords == null)
      this.getViewpoint();
    return this._keywords;
  },

  //TODO
  get fragments(){

    if(this._fragments == null)
      this.getViewpoint();
    return this._fragments;
  },

  //TODO
  get myCorpusID(){
    var logger = Log4Moz.repository.getLogger("lasuli.hypertopic.myCorpusID");
    logger.debug((this._myCorpusID != null));
    if(this._myCorpusID != null)  return this._myCorpusID;
    var corpora;
    try{
      corpora = HypertopicMap.listCorpora(HypertopicMap.user);
    }catch(e){
      dispatch("lasuli.ui.doShowMessage", {"title": _("Error"), "content": _('couchdb.inaccessible', [HypertopicMap.baseUrl])});
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
          this._myCorpusID = corpus.id;
          return this._myCorpusID;
        }
      return this.createMyCorpus();
    }
  },

  //TODO
  get allFragments(){
    var logger = Log4Moz.repository.getLogger("lasuli.hypertopic.allFragments");
    var tags = this.tags;
    //Get all useful topics
    var topics = {};
    for each(var tag in tags){
      for(var i=0, topic; topic = tag.topics[i]; i++)
        topics[topic.viewpointID + "_id_" + topic.topicID] = {};
    }
    logger.debug(topics);
    var coordinates = {};
    var tmps = new Array();
    for(var corpusID in this.items)
    {
      var itemIDs = this.items[corpusID];
      for(var i=0, itemID; itemID = itemIDs[i]; i++)
      {
        var item = HypertopicMap.getItem(corpusID, itemID);
        // go through the highlights
        for(var k in item)
          if("coordinates" in item[k]){
            logger.debug(tmps);
            var topic = {"viewpointID": item[k].topic[0].viewpoint, "topicID": item[k].topic[0].id};
            logger.debug(topic);
            logger.debug(typeof(topics[topic.viewpointID + "_id_" + topic.topicID]));
            //Only unique coordinates should be returned.
            if(tmps.indexOf(item[k].coordinates[0]) < 0 && topics[topic.viewpointID + "_id_" + topic.topicID])
            {
              tmps.push(item[k].coordinates[0]);
              coordinates[k]={ "startPos": item[k].coordinates[0][0], "endPos": item[k].coordinates[0][1]};
            }
          }
      }
    }
    logger.debug(coordinates);
    return coordinates;
  },

  //TODO
  get tags(){
    var logger = Log4Moz.repository.getLogger("lasuli.hypertopic.tags");
    if(this._tags) return this._tags;
    logger.debug(this.items);
    this._tags = {};
    var tags = {};
    for(var corpusID in this.items)
    {
      var itemIDs = this.items[corpusID];
      for(var i=0, itemID; itemID = itemIDs[i]; i++)
      {
        var item = HypertopicMap.getItem(corpusID, itemID);
        //logger.debug(item);
        if(item.topic)
          for(var j=0, topic; topic = item.topic[j]; j++)
          {
            var k = JSON.stringify({"viewpointID": topic.viewpoint, "topicID": topic.id});
            (!tags[k]) ? tags[k] = 1 : tags[k]++;
          }
        for each (var prop in item)
          if("coordinates" in prop)
            for(var j=0, topic; topic = prop.topic[j]; j++)
            {
              var k = JSON.stringify({"viewpointID": topic.viewpoint, "topicID": topic.id});
              (!tags[k]) ? tags[k] = 1 : tags[k]++;
            }
      }
    }
    logger.debug(tags);
    for(var k in tags){
      t = JSON.parse(k);
      topic = HypertopicMap.getTopic(t.viewpointID, t.topicID);
      if(!topic || !topic.name) continue;
      logger.debug(topic);

      if(topic.name == "") topic.name = _("no.name");
      if(!this._tags[topic.name])
      {
        this._tags[topic.name] = {};
        this._tags[topic.name].size = tags[k];
        this._tags[topic.name].topics = new Array(t);
      }
      else
      {
        this._tags[topic.name].size += tags[k];
        this._tags[topic.name].topics.push(t);
      }
    }
    return this._tags;
  },
  set tags(val){
    this._tags = val;
  },

  get viewpoints(){
    var logger = Log4Moz.repository.getLogger("lasuli.hypertopic.viewpoints");
    if(this._viewpoints) return this._viewpoints;

    this._viewpoints = {};
    if(!this.user)
    {
      logger.fatal("User {" + HtServers.freecoding.user + "} isn't exist yet");
      return null;
    }

    logger.debug(this.user.getObject());

    var viewpoints = this.user.listViewpoints();
    if(!viewpoints) return null;
    logger.debug(JSON.stringify(viewpoints));

    for(var i=0, viewpoint; viewpoint = viewpoints[i]; i++)
      this._viewpoints[viewpoint.id] = viewpoint.name;
    return this._viewpoints;
  },

  set viewpoints(v){
    this._viewpoints = v;
  },

  createViewpoint : function(viewpointName){
    var logger = Log4Moz.repository.getLogger("lasuli.hypertopic.createViewpoint");
    logger.debug(viewpointName);
    if(!this.user)
      return false;

    logger.debug(this.user.getObject());
    var viewpoint = this.user.createViewpoint(viewpointName);
    logger.debug(viewpoint.getObject());
    if(viewpoint)
    {
      this.viewpoints = null;
      return true;
    }
    return false;
  },

  destroyViewpoint: function(viewpointID){
    var logger = Log4Moz.repository.getLogger("lasuli.hypertopic.destroyViewpoint");
    logger.debug(viewpointID);
    var viewpoint = HtServers.freecoding.getViewpoint(viewpointID);
    logger.debug(viewpoint);
    if(viewpoint.destroy())
    {
      this._viewpoints = null;
      return true;
    }
    return false;
  },

  createItem : function(name){
    var logger = Log4Moz.repository.getLogger("lasuli.hypertopic.createItem");
    name = name || _("no.name");
    if(!this.item)
    {
      logger.debug("create a new item");
      logger.debug(this.corpus);
      var item = this.corpus.createItem(name);
      if(item)
      {
        item.describe("resource", this.currentUrl);
        logger.debug(item.getObject());
        this._items = null;
        return true;
      }
      return false;
    }
    return true;
  },

  createAttribute : function(attribute){
    var logger = Log4Moz.repository.getLogger("lasuli.hypertopic.createAttribute");
    logger.debug(attribute);
    var result = this.item.describe(attribute.name, attribute.value);
    logger.debug(this.item.getObject());
    logger.debug(JSON.stringify(result));
    if(result)
    {
      this._items = null;
      this._attributes = null;
      return true;
    }
    return false;
  },

  destroyAttribute : function(attribute){
    var logger = Log4Moz.repository.getLogger("lasuli.hypertopic.destroyAttribute");
    logger.debug(attribute);
    for each(var item in this.items){
      logger.debug(item.getRaw());
      item.undescribe(attribute.name, attribute.value);
      logger.debug(item.getRaw());
    }
    this._attributes = null;
  },

  createKeyword : function(viewpointID, topicID, name){
    var logger = Log4Moz.repository.getLogger("lasuli.hypertopic.createKeyword");
    if(!this.itemID) this.createItem();
    logger.debug("this.itemID:" + this.itemID);
    logger.debug("this.keywords");
    logger.debug(this.keywords);
    var keyword = {"viewpointID":viewpointID, "topicID":topicID , "name": name};
    //Tag the item
    try{
      result = HypertopicMap.tagItem(this.itemID, viewpointID, topicID);
    }catch(e){
      logger.fatal("error when try to tag the item: " + this.itemID);
      logger.fatal(tag);
      logger.fatal(e);
      dispatch("lasuli.ui.doShowMessage", {"title": _("Error"), "content": _('tagItem.failed', [tag.name])});
    }
    this._keywords[keyword.topicID] = keyword;
    logger.debug(keyword);
    logger.debug(this.keywords);
    if(this._topics[keyword.topicID])
      delete this._topics[keyword.topicID];
    return keyword;
  },

  destroyKeyword : function(keyword){
    var logger = Log4Moz.repository.getLogger("lasuli.hypertopic.destroyKeyword");
    logger.debug(keyword);
    var result = false;
    try{
      result = HypertopicMap.untagItem(this.itemID, keyword.viewpointID, keyword.topicID);
    }catch(e){
      logger.fatal("error when try to remove the following tag from item: " + this.itemID);
      logger.fatal(keyword);
      logger.fatal(e);
    }
    if(!result)
      return false;
    else
    {
      delete this._keywords[keyword.topicID];
      var i = 1;
      for(var name in this.topics){
        logger.debug(name);
        i++;
      }
      logger.debug(i);
      var color = colorUtil.index2rgb(i);
      logger.debug(color);
      var topic = {"viewpointID": keyword.viewpointID, "topicID": keyword.topicID, "name": keyword.name, "color": color};

      this._topics[keyword.topicID] = topic;
      logger.debug(topic);
      return topic;
    }
  },

  renameKeyword : function(keyword){
    var logger = Log4Moz.repository.getLogger("lasuli.hypertopic.renameKeyword");
    try{
      result = HypertopicMap.renameTopic(keyword.viewpointID, keyword.topicID, keyword.newName);
    }catch(e){
      logger.fatal("error when try to rename tag : ");
      logger.fatal(keyword);
      logger.fatal(e);
    }

    if(!result)
      return false;
    else
    {
      this._keywords[keyword.topicID].name = keyword.newName;
      return true;
    }
  },

  createAnalysis : function(viewpointID, topicID, topicName){
    var logger = Log4Moz.repository.getLogger("lasuli.hypertopic.createAnalysis");
    var topicIDs = (topicID) ? new Array(topicID) : new Array();
    topicName = (topicName) ? topicName : _("no.name");
    var topicID = HypertopicMap.createTopicIn(viewpointID, topicIDs);
    if(!topicID)
    {
      dispatch("lasuli.ui.doShowMessage", {"title": _("Error"), "content": _('analysis.topic.create.failed')});
      return false;
    }
    logger.debug(topicID);
    var result = HypertopicMap.renameTopic(viewpointID, topicID, topicName);
    logger.debug(result);
    var i = 1;
    for(var name in this.topics){
      logger.debug(name);
      i++;
    }
    logger.debug(i);
    var color = colorUtil.index2rgb(i);
    logger.debug(color);
    topic = {"viewpointID": viewpointID, "topicID": topicID, "name": topicName, "color": color};
    this._topics[topicID] = topic;
    logger.debug(topic);
    return topic;
  },

  //Return the fragment IDs which should be removed.
  destroyAnalysis: function(viewpointID, topicID, name){
    var logger = Log4Moz.repository.getLogger("lasuli.hypertopic.destroyAnalysis");
    var result = HypertopicMap.destroyTopic(viewpointID, topicID);
    logger.debug(result);
    if(result)
    {
      delete this._topics[topicID];
      var fragmentIDs = new Array();
      for(var fragmentID in this._fragments)
        if(this._fragments[fragmentID].topicID == topicID && this._fragments[fragmentID].viewpointID == viewpointID)
        {
          fragmentIDs.push(fragmentID);
          delete this._fragments[fragmentID];
        }
      return fragmentIDs;
    }
    return false;
  },

  renameAnalysis : function(viewpointID, topicID, name, newName){
    var logger = Log4Moz.repository.getLogger("lasuli.hypertopic.renameAnalysis");
    logger.debug(newName);
    var result = HypertopicMap.renameTopic(viewpointID, topicID, newName);
    logger.debug(result);
    if(result)
    {
      this._topics[topicID].name = newName;
      return true;
    }
    return false;
  },

  //Load all data of a specific viewpoint
  getViewpoint : function(){
    var logger = Log4Moz.repository.getLogger("lasuli.hypertopic.getViepwoint");
    this._topics = {};
    this._fragments = {};
    this._keywords = {};
    logger.debug(this.items);
    var items = new Array();
    for each (var rows in this.items){
      items = items.concat(rows);
    }
    logger.debug(this._keywords);
    for(var corpusID in this.items)
      for(var i=0, itemID; itemID = this.items[corpusID][i]; i++)
      {
        var item = HypertopicMap.getItem(corpusID, itemID);
        //logger.debug("corpusID:" + corpusID + ", itemID:" + itemID);
        //logger.debug(item);
        if(item.topic && item.topic.length > 0)
          for(var j=0, topic; topic = item.topic[j]; j++)
            if(topic.viewpoint == this.viewpointID)
              this._keywords[topic.id] = topic;
      }

    logger.debug("this._keywords");
    logger.debug(this._keywords);
    var viewpoint = HypertopicMap.getViewpoint(this.viewpointID);
    var colorIndex = 0;
    for(var id in viewpoint)
    {
      //is the topic
      if(viewpoint[id].name)
      {
        var topic = viewpoint[id];
        var topicID = id;
        var name = (viewpoint[id].name.length > 0) ? viewpoint[id].name[0] : viewpoint[id].name;

        if(topicID in this._keywords)
          this._keywords[topicID] = {"viewpointID": this.viewpointID, "topicID": topicID, "name": name};
        else
        {
          var color = colorUtil.index2rgb(colorIndex++);
          this._topics[topicID] = {"viewpointID": this.viewpointID, "topicID": topicID, "name": name, "color": color};
        }

        if(topic.highlight)
          for each (var row in topic.highlight)
            if(items.indexOf(row.item) >= 0)
              this._fragments[row.id] = {"startPos": row.coordinates[0], "endPos": row.coordinates[1], "text": row.text,
                          "corpusID": row.corpus, "itemID": row.item, "topicID": topicID, "viewpointID": this.viewpointID};
      }
    }
  },

  renameViewpoint : function(viewpointID,name){
    var logger = Log4Moz.repository.getLogger("lasuli.hypertopic.renameViewpoint");
    return HypertopicMap.renameViewpoint(viewpointID, name);
  },

  createTopicIn : function(viewpointID, topicID, name){
    var logger = Log4Moz.repository.getLogger("lasuli.hypertopic.createTopicIn");
    var topicIDs = (topicID) ? new Array(topicID) : new Array();
    var topicID = HypertopicMap.createTopicIn(viewpointID, topicIDs);
    if(!topicID) return false;
    if(name)
      var result = HypertopicMap.renameTopic(viewpointID, topicID, name);
    return topicID;
  },

  destroyTopic : function(viewpointID, topicID){
    var logger = Log4Moz.repository.getLogger("lasuli.hypertopic.destroyTopic");
    var result = HypertopicMap.destroyTopic(viewpointID, topicID);
    logger.debug(result);
    if(result)
      return true;
    else
      return false;
  },

  getViewpointName : function(viewpointID){
    var logger = Log4Moz.repository.getLogger("lasuli.hypertopic.getViewpointName");
    if(this._viewpoints && this._viewpoints[viewpointID])
      return this._viewpoints[viewpointID];

    var viewpointName = HtServers.freecoding.getViewpoint(viewpointID).getName();
    logger.debug(viewpointName);
    if(!viewpointName)
      for(var key in HtServers)
      {
        if(key == "freecoding") continue;
        logger.debug(key);
        viewpointName = HtServers[key].getViewpoint(viewpointID).getName();
        logger.debug(viewpointName);
        if(viewpointName)
          break;
      }
    if(!viewpointName) return false;
    this._viewpoints[viewpointID] = viewpointName;
    return viewpointName;
  },

  getViewpointsByUser : function(userID){
    var logger = Log4Moz.repository.getLogger("lasuli.hypertopic.getViewpointsByUser");
    //logger.debug(userID);
    var result = new Array();
    for(var k in HtServers)
    {
      var user = HtServers[k].getUser(userID);
      if(!user) continue;
      //logger.debug(user.getObject());
      var viewpoints = user.listViewpoints();
      if(!viewpoints) continue;
      //logger.debug("viewpoints");
      //logger.debug(viewpoints);
      //If this viewpoint is on auto-coding server, should check if the viewpoint existed on freecoding server.
      if(k == "freecoding")
        for(var i=0, viewpoint; viewpoint = viewpoints[i]; i++)
        {
          if(result.indexOf(viewpoint) < 0)
            result.push(viewpoint);
        }
      else
        for(var i=0, viewpoint; viewpoint = viewpoints[i]; i++)
        {
          viewpointName = HtServers[k].getViewpoint().getName();
          if(!viewpointName)
            viewpointName = HtServers.freecoding.getViewpoint().getName();
          if(!viewpointName)
            continue;
          if(result.indexOf(viewpoint) < 0)
            result.push(viewpoint);
        }
    }
    //logger.debug("result");
    //logger.debug(result);
    return result;
  },

  createFragment: function(startPos, endPos, text, viewpointID, topicID){
    var logger = Log4Moz.repository.getLogger("lasuli.hypertopic.createFragment");
    var topic = null;
    if(!topicID){
      topic = this.createAnalysis(viewpointID);
      if(!topic)
        throw Exception('cannot.create.analysis');
      logger.debug('created a new topic');
      logger.debug(topic);
      topicID = topic.topicID;
    }
    var corpusID = this.corpusID;
    if(!this.itemID){
      this.createItem();
      corpusID = this.myCorpusID;
    }

    var fragmentID = HypertopicMap.tagFragment(this.itemID, new Array(startPos, endPos), text, viewpointID, topicID);
    logger.debug("fragmentID:" + fragmentID);
    this._fragments[fragmentID] = {"startPos": startPos, "endPos": endPos, "text": text,
                          "corpusID": corpusID, "itemID": this.itemID, "topicID": topicID, "viewpointID": viewpointID};
    return {"topic": topic, "fragmentID": fragmentID, "itemID": this.itemID};
  },

  destroyFragment: function(itemID, fragmentID){
    var result = HypertopicMap.untagFragment(itemID, fragmentID);
    if(result){
      delete this._fragments[fragmentID];
      return true;
    }
    return false;
  },

  moveFragment : function(itemID, fragmentID, viewpointID, targetTopicID){
    var result = HypertopicMap.moveFragment(itemID, fragmentID, viewpointID, targetTopicID);
    if(result){
      this._fragments[fragmentID].topicID = targetTopicID;
      return true;
    }
    return false;
  },

  getNarrowers : function(viewpoint, topicID){
    var topics = new Array();
    if(!viewpoint[topicID] || !viewpoint[topicID].narrower)
      return topics;
    for(var i=0, topic; topic = viewpoint[topicID].narrower[i]; i++)
    {
      var obj = {};
      obj.data = topic.name || "";
      var topicType = this.getTopicType(this.viewpointID, topic.id);
      obj.attr = {"viewpointID": this.viewpointID, "topicID": topic.id, "name": obj.data + "", "rel": topicType};
      obj.children = this.getNarrowers(viewpoint, topic.id);
      topics.push(obj);
    }
    return topics;
  },

  getTopicType : function(viewpointID, topicID){
    if(this.keywords[topicID]) return 'keyword';

    for each(var fragment in this.fragments)
      if(fragment.viewpointID == viewpointID && fragment.topicID == topicID)
        return 'analysis';

    return 'topic';
  },

  get topicTree(){
    var logger = Log4Moz.repository.getLogger("lasuli.hypertopic.getTopicTree");
    logger.debug(this.viewpointID);
    var topics = {};
    var viewpoint = HypertopicMap.getViewpoint(this.viewpointID);
    logger.debug(viewpoint);
    if(!viewpoint) return topics;
    logger.debug('put viewpoint as the root topic');
    topics.data = new Array();
    var root = {};
    root.data = viewpoint.name;
    root.attr = {"viewpointID": this.viewpointID, "name": root.data + "", "rel": "viewpoint"};
    root.children = new Array();
    root.state = 'open';

    if(!viewpoint.upper) {
      logger.debug('has no topic');
      topics.data.push(root);
      logger.debug(topics);
      return topics;
    }

    for(var i=0, topic; topic = viewpoint.upper[i]; i++)
    {
      var obj = {};
      obj.data = topic.name || "";
      var topicType = this.getTopicType(this.viewpointID, topic.id);
      obj.attr = {"viewpointID": this.viewpointID, "topicID": topic.id, "name": obj.data + "", "rel": topicType};
      obj.children = this.getNarrowers(viewpoint, topic.id);
      root.children.push(obj);
    }

    topics.data.push(root);
    return topics;
  }
}