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
    this._locations = {};
    this._keywords = null;

    this._docKeywords = null;
    this._docTopics = null;
    this._docTags = null;

    this._itemID = null;
    this._corpusID = null;
    this._tags = null;
    this._fragments = null;

    this._viewpointID = null;
    if(url == "about:blank") return false;
  },

  get viewpoint(){
    var logger = Log4Moz.repository.getLogger("lasuli.hypertopic.viewpoint");
    var k = (this._locations[this.viewpointID]) ? this._locations[this.viewpointID] : "freecoding";
    logger.debug(k);
    return HtServers[k].getViewpoint(this.viewpointID);
  },

  //TODO
  get viewpointID(){
    return this._viewpointID;
  },
  set viewpointID(id){
    if(id != this._viewpointID)
    {
      this._keywords = null;
      this._topics = null;
      this._fragments = null;

      this._viewpointID = id;
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
    for(var k in HtServers)
    {
      //logger.debug(key);
      //logger.debug(HtServers[key].baseUrl);
      var item = HtServers[k].getItem(this.currentUrl);
      if(item)
      {
        //logger.debug(item.getObject());
        this._items[k] = item;
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

  get docFragments(){
    var logger = Log4Moz.repository.getLogger("lasuli.hypertopic.docFragments");
    var result = {};
    for(var k in this.items){
      var item = this.items[k];
      logger.debug(item.getObject());
      var fragments = item.getHighlights();
      for(var j=0, fragment; fragment = fragments[j]; j++){
        logger.debug(fragment.getID());
        this._locations[fragment.getID()] = k;
        result[fragment.getID()] = fragment;
      }
    }
    return result;
  },

  get docKeywords(){
    var logger = Log4Moz.repository.getLogger("lasuli.hypertopic.docKeywords");
    if(this._docKeywords) return this._docKeywords;
    this._docKeywords = {};
    logger.debug("docKeywords");
    for each(var item in this.items){
      logger.debug(item.getObject());
      var topics = item.getTopics();
      logger.debug(topics);
      for(var j=0, topic; topic = topics[j]; j++)
      {
        var topicID = topic.getID();
        if(topicID in this._docKeywords)
          this._docKeywords[topicID].count++;
        else
        {
          this._docKeywords[topicID] = topic;
          this._docKeywords[topicID].count = 1;
        }
      }
    }
    logger.debug(this._docKeywords);
    return this._docKeywords;
  },

  get docTopics(){
    var logger = Log4Moz.repository.getLogger("lasuli.hypertopic.docTopics");
    if(this._docTopics) return this._docTopics;
    this._docTopics = {};
    for each(var fragment in this.docFragments){
      logger.debug(fragment);
      var topics = fragment.getTopic();
      var viewpointID = topics[0].viewpoint;
      //First try to load this topic from his server
      var k = this._locations[fragment.getID()];
      var topic = HtServers[k].getTopic(topics[0]);
      var topicName = topic.getName();
      //On freecoding server but cannot get the topic name? skip
      if(k == "freecoding" && !topicName) continue;
      if(!topicName)
      {
        topic = HtServers.freecoding.getTopic(topics[0]);
        topicName = topic.getName();
        //Try on freecoding server but this topic still not existed
        if(!topicName)
          continue;
        else
          k = "freecoding";
      }
      logger.debug(topic.getObject());
      var topicID = topic.getID();
      this._locations[viewpointID] = k;
      this._locations[topicID] = k;
      if(topicID in this._docTopics)
        this._docTopics[topicID].count++;
      else
      {
        this._docTopics[topicID] = topic;
        this._docTopics[topicID].count = 1;
      }
    }
    logger.debug(this._docTopics);
    return this._docTopics;
  },

  get docTags(){
    var logger = Log4Moz.repository.getLogger("lasuli.hypertopic.docTags");
    var result = {};
    for each(var topic in this.docTopics)
    {
      var topicName = topic.getName();
      //logger.debug("topic");
      //logger.debug(topicName);
      if(topicName)
      {
        if(topicName in result)
          result[topicName].size++;
        else
          result[topicName] = topic.count;
      }
    }

    for each(var topic in this.docKeywords)
    {
      var topicName = topic.getName();
      if(topicName)
      {
        if(topicName in result)
          result[topicName].size++;
        else
          result[topicName] = topic.count;
      }
    }
    return result;
  },

  get docCoordinates(){
    var logger = Log4Moz.repository.getLogger("lasuli.hypertopic.docCoordinates");
    var result = {};
    for each(var fragment in this.docFragments){
      var coordinate = fragment.getCoordinates();
      result[fragment.getID()]={ "startPos": coordinate[0][0], "endPos": coordinate[0][1]};
    }
    logger.debug(result);
    return result;
  },

  get topics(){
    var logger = Log4Moz.repository.getLogger("lasuli.hypertopic.topics");
    if(this._topics) return this._topics;
    this._topics = {};
    var topics = this.viewpoint.getTopics();
    for(var i=0, topic; topic = topics[i]; i++)
      if(!(topic.getID() in this.keywords)){
        var topicName = topic.getName();
        if(!topicName) continue;
        this._topics[topic.getID()] =  {"topicID": topic.getID(), "viewpointID": this.viewpointID, "name": topicName};
      }
    var i=0;
    for(var topicID in this._topics)
      this._topics[topicID].color = colorUtil.index2rgb(i++);
    return this._topics;
  },

  get keywords(){
    var logger = Log4Moz.repository.getLogger("lasuli.hypertopic.keywords");
    logger.debug(this._keywords);
    if(this._keywords) return this._keywords;
    this._keywords = {};
    logger.debug("viewpoint keywords");
    for each(var topic in this.docKeywords)
    {
      logger.debug(topic);
      logger.debug(topic.getViewpointID());

      if(topic.getViewpointID() == this.viewpointID)
      {
        var topicName = topic.getName();
        if(!topicName) continue;
        this._keywords[topic.getID()] = {"topicID": topic.getID(), "viewpointID": this.viewpointID, "name": topicName};
      }
    }
    logger.debug(this._keywords);
    return this._keywords;
  },

  get fragments(){
    var logger = Log4Moz.repository.getLogger("lasuli.hypertopic.fragments");
    if(this._fragments) return this._fragments;
    this._fragments = {};
    for each(var fragment in this.docFragments){
      var topic = fragment.getTopic();
      if(topic.viewpoint.id == this.ViewpointID)
        this._fragments[fragment.getID()] = fragment;
    }
    return this._fragments;
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
    var topic = this.viewpoint.getTopic(topicID);
    var result = this.item.tag(topic);
    if(!result)
    {
      dispatch("lasuli.ui.doShowMessage", {"title": _("Error"), "content": _('tagItem.failed', [name])});
      return false;
    }
    this._keywords = null;
    this._topics = null;
    return true;
  },

  destroyKeyword : function(keyword){
    var logger = Log4Moz.repository.getLogger("lasuli.hypertopic.destroyKeyword");
    logger.debug(keyword);
    if(!this.viewpoint) return false;
    logger.debug(this.viewpoint.getObject());
    var topic = this.viewpoint.getTopic(keyword.topicID);
    var result = topic.destroy();
    return result;
  },

  renameKeyword : function(keyword){
    var logger = Log4Moz.repository.getLogger("lasuli.hypertopic.renameKeyword");
    if(!this.viewpoint) return false;
    var topic = this.viewpoint.getTopic(keyword.topicID);
    return topic.rename(keyword.newName);
  },

  createAnalysis : function(viewpointID, topicID, topicName){
    var logger = Log4Moz.repository.getLogger("lasuli.hypertopic.createAnalysis");
    logger.debug(this.viewpoint.getObject());
    var topicIDs = (topicID) ? new Array(topicID) : null;
    topicName = (topicName) ? topicName : _("no.name");
    logger.debug(topicIDs);
    logger.debug((topicIDs instanceof Array));
    var topic = this.viewpoint.createTopic(topicIDs, topicName);
    logger.debug(topic);
    if(!topic)
    {
      dispatch("lasuli.ui.doShowMessage", {"title": _("Error"), "content": _('analysis.topic.create.failed')});
      return false;
    }
    logger.debug(topic.getObject());
    var i=0;
    for(var name in this.topics){
      i++;
    }
    logger.debug(i);
    var color = colorUtil.index2rgb(i);
    return {"viewpointID": viewpointID, "topicID": topic.getID(), "name": topicName, "color": color};;
  },

  //Return the fragment IDs which should be removed.
  destroyAnalysis: function(viewpointID, topicID, name){
    var logger = Log4Moz.repository.getLogger("lasuli.hypertopic.destroyAnalysis");
    if(!this.viewpoint) return false;
    var topic = this.viewpoint.getTopic(topicID);
    var result = topic.destroy();
    return result;
  },

  renameAnalysis : function(viewpointID, topicID, name, newName){
    var logger = Log4Moz.repository.getLogger("lasuli.hypertopic.renameAnalysis");
    if(!this.viewpoint) return false;
    var topic = this.viewpoint.getTopic(topicID);
    return topic.rename(newName);
  },

  //Load all data of a specific viewpoint
  getViewpoint : function(){
    var logger = Log4Moz.repository.getLogger("lasuli.hypertopic.getViepwoint");
    return null;
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
    if(!this.viewpoint) return false;
    return this.viewpoint.rename(name);
  },

  //TODO
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

  getViewpointsByTopicName : function(topicName){
    var logger = Log4Moz.repository.getLogger("lasuli.hypertopic.getViewpointsByTopicName");
    logger.debug(topicName);
    var viewpoints = new Array();
    for each(var topic in this.docKeywords)
      if(topicName == topic.getName()){
        logger.debug(topic);
        viewpoints.push({"id": topic.getViewpointID(), "name": topic.Viewpoint.getName()});
      }
    logger.debug(viewpoints);
    return viewpoints;
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
      logger.debug("viewpoints");
      logger.debug(viewpoints);
      logger.debug(k);
      //If this viewpoint is on auto-coding server, should check if the viewpoint existed on freecoding server.
      if(k == "freecoding")
        for(var i=0, viewpoint; viewpoint = viewpoints[i]; i++)
        {
          this._locations[viewpoint.id] = "freecoding";
          if(result.indexOf(viewpoint) < 0)
            result.push(viewpoint);
        }
      else
        for(var i=0, viewpoint; viewpoint = viewpoints[i]; i++)
        {
          viewpointName = HtServers[k].getViewpoint().getName();
          this._locations[viewpoint.id] = k;
          if(!viewpointName)
          {
            viewpointName = HtServers.freecoding.getViewpoint().getName();
            if(viewpointName)
              this._locations[viewpoint.id] = "freecoding";
          }
          if(!viewpointName){
            delete this._locations[viewpoint.id];
            continue;
          }

          if(result.indexOf(viewpoint) < 0)
            result.push(viewpoint);
        }
    }
    return result;
  },
  //TODO
  createFragment: function(topicID, text, coordinates){
    var logger = Log4Moz.repository.getLogger("lasuli.hypertopic.createFragment");
    logger.debug(coordinates);
    logger.debug(topicID);
    logger.debug(text);
    if(!topicID)
    {
      topic = this.createAnalysis(this.viewpointID);
      topicID = topic.topicID;
    }
    var topic = this.viewpoint.getTopic(topicID);
    logger.debug(topic);
    if(!topic) return false;
    var fragment = this.item.createHighlight(topic, text, coordinates);
    logger.debug(fragment);
    var fragmentID = fragment.getID();

    this._fragments = null;
    return {"topic": topic, "fragmentID": fragmentID, "itemID": this.itemID};
  },

  //TODO
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

  getNarrowers : function(topic){
    var topics = new Array();
    var narrower = topic.getNarrower();
    if(!narrower || !(narrower.length > 0))
      return topics;

    for(var i=0, t; t = narrower[i]; i++)
    {
      var obj = {};
      obj.data = t.getName() || "";
      var topicType = this.getTopicType(this.viewpointID, t.getID());
      obj.attr = {"viewpointID": this.viewpointID, "topicID": t.getID(), "name": obj.data + "", "rel": topicType};
      obj.children = this.getNarrowers(t);
      topics.push(obj);
    }
    return topics;
  },

  getTopicType : function(viewpointID, topicID){
    if(topicID in this.docKeywords) return 'keyword';
    if(topicID in this.docTopics) return 'analysis';
    return 'topic';
  },

  get topicTree(){
    var logger = Log4Moz.repository.getLogger("lasuli.hypertopic.getTopicTree");
    logger.debug(this.viewpointID);
    var topics = {};

    if(!this.viewpoint) return topics;
    logger.debug('put viewpoint as the root topic');

    topics.data = new Array();
    var root = {};
    root.data = this.viewpoint.getName();
    root.attr = {"viewpointID": this.viewpointID, "name": root.data + "", "rel": "viewpoint"};
    root.children = new Array();
    root.state = 'open';

    var upper = this.viewpoint.getUpperTopics();
    if(!upper) {
      logger.debug('has no topic');
      topics.data.push(root);
      logger.debug(topics);
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

    topics.data.push(root);
    return topics;
  }
}