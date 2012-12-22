let EXPORTED_SYMBOLS = ["getUUID", "HtServers", "HtMap"];

const Exception = Components.Exception;
const Cc = Components.classes;
const Ci = Components.interfaces;
const Cu = Components.utils;
const include = Cu.import;

include("resource://lasuli/modules/log4moz.js");
include("resource://lasuli/modules/XMLHttpRequest.js");
include("resource://lasuli/modules/Sync.js");
include("resource://lasuli/modules/Base64.js");
include("resource://lasuli/modules/Preferences.js");

var HtServers = {};
var HtCaches = {};

function getObject(obj) {
  //var logger = Log4Moz.repository.getLogger("getObject");
  var self = JSON.parse(JSON.stringify(obj));
  for(var k in self)
  {
    //logger.trace(k);
    //logger.trace(typeof(self[k]));
    if(typeof(self[k]) == "function" || k == "htMap")
      delete self[k];
    if(typeof(self[k]) == "object")
      self[k] = getObject(self[k]);
  }
  return JSON.parse(JSON.stringify(self));
}
function getUUID() {
  var uuidGenerator =
    Components.classes["@mozilla.org/uuid-generator;1"]
            .getService(Components.interfaces.nsIUUIDGenerator);
  var uuid = uuidGenerator.generateUUID();
  var uuidString = uuid.toString();

  return uuidString.replace('{', '').replace('}', '').replace(/-/gi, '');
}
function uniqueArray(b){
  var a = [];
  var l = b.length;
  for(var i=0; i<l; i++) {
    for(var j=i+1; j<l; j++) {
      // If this[i] is found later in the array
      if (b[i] === b[j])
        j = ++i;
    }
    a.push(b[i]);
  }
  return a;
}
function intersect(a1, a2) {
  var a = [];
  var l = a1.length;
  var l2 = a2.length;
  for(var i=0; i<l; i++) {
    for(var j=0; j<l2; j++) {
      if (a1[i] === a2[j])
        a.push(a1[i]);
    }
  }
  return uniqueArray(a);
}
function HtMap(baseUrl, user, pass) {
  var logger = Log4Moz.repository.getLogger("HtMap");
  var regexp = /(http|https):\/\/(\w+:{0,1}\w*@)?(\S+)(:[0-9]+)?(\/|\/([\w#!:.?+=&%@!\-\/]))?/;

  //Check the baseUrl is a correct URL
  if(!baseUrl || baseUrl === "" || !regexp.test(baseUrl))
  {
      logger.fatal("BaseUrl is not a validate URL:" + baseUrl);
      throw URIError('baseUrl is not a vaildate URL!');
  }
  //If the baseUrl is not end with "/" append slash to the end.
  this.baseUrl = (baseUrl.substr(-1) == "/") ? baseUrl : baseUrl + "/";
  logger.debug(this.baseUrl);
  
  //Create the XMLHttpRequest object for HTTP requests
  this.xhr = new XMLHttpRequest();
  //Overrides the MIME type returned by the hypertopic service.
  this.xhr.overrideMimeType('application/json');

  this.user = user || "";
  this.pass = pass || "";

  logger.trace(this.user);
  logger.trace(this.pass);
  
  this.serverType = this.getServerType();
  if(!this.serverType)
    return false;
  logger.trace(this.serverType);
  logger.trace(this.baseUrl);


  //Initial the local cache
  HtCaches[baseUrl] = {};
  //Set to false to disable cache for debuging
  this.enableCache = Preferences.get("extensions.lasuli.cache", true);
  logger.trace(this.enableCache);
}
HtMap.prototype.purgeCache = function(){
  //var logger = Log4Moz.repository.getLogger("HtMap.purgeCache");
  HtCaches[this.baseUrl] = {};
}
HtMap.prototype.getServerType = function(){
  var logger = Log4Moz.repository.getLogger("HtMap.getServerType");
  var result = this.httpGet('/');
  logger.trace(result);
  if(typeof result['service'] == 'string')
    return result['service'].toLowerCase();
  return false;
}
HtMap.prototype.getLastSeq = function(){
  var result = this.httpGet('_changes');
  if(result)
    return result.last_seq;
  else
    return false;
}

HtMap.prototype.getType = function() {
  return "HtMap";
}
/**
 * @param object null if method is GET or DELETE
 * @return response body
 */
HtMap.prototype.send = function(httpAction, httpUrl, httpBody) {
  var logger = Log4Moz.repository.getLogger("HtMap.send");
  //Default HTTP action is "GET"
  httpAction = (httpAction) ? httpAction : "GET";
  //cache is enabled
  if(this.enableCache)
  {
    if(typeof(HtCaches[this.baseUrl]) == "undefined")
      HtCaches[this.baseUrl] = {};

    //Is PUT/DELETE/POST action then clear the cache
    if(httpAction != 'GET')
      HtCaches[this.baseUrl] = {};
    else
      //Try to load from the cache
      if(typeof( HtCaches[this.baseUrl][httpUrl]) != "undefined")
      {
        //logger.debug("Found from cache:" + httpUrl);
        return HtCaches[this.baseUrl][httpUrl];
      }
  }
  
  //Default HTTP URL is the baseUrl
  httpUrl = (httpUrl) ? httpUrl : this.baseUrl;
  //Uncomment the following line to disable cache

  httpBody = (!httpBody) ? "" : ((typeof(httpBody) == "object")
                                  ? JSON.stringify(httpBody) : httpBody);
  logger.trace(httpAction + " " + httpUrl);
  
  var result = null;
  var startTime = new Date().getTime();
  try{
    var auth = "Basic " + base64_encode(this.user + ':' + this.pass);
    //logger.trace(auth);
    this.xhr.open(httpAction, httpUrl, false, this.user, this.pass);
    //If there is a request body, set the content-type to json
    if(httpBody && httpBody != '')
      this.xhr.setRequestHeader('Content-Type', 'application/json');
		
		this.xhr.setRequestHeader('Accept', 'application/json');
    this.xhr.setRequestHeader('Authorization', auth);

    //If the request body is an object, serialize it to json
    if(typeof(httpBody) != 'string')
      httpBody = JSON.stringify(httpBody);

    this.xhr.send(httpBody);
    if(httpBody != "")
      logger.trace(httpBody);
    var endTime = new Date().getTime();
    logger.trace("Status Code:" + this.xhr.status);
    logger.trace("Execution time: " + (endTime - startTime) + "ms");
    //If the response status code is not start with "2",
    //there must be something wrong.
    if((this.xhr.status + "").substr(0,1) != '2')
    {
      logger.fatal(this.xhr.status);
      throw Error(httpAction + " " + httpUrl + "\nResponse: " +this.xhr.status);
    }
    result = this.xhr.responseText;
    if(typeof(result) == "string" && result.length > 0)
      logger.trace(result);
    //Clear cache
    if(this.enableCache && httpAction != 'GET')
      this.purgeCache();

    try{
      if(typeof(result) == "string" && result.length > 0)
      {
        if(this.enableCache && httpAction == 'GET')
          HtCaches[this.baseUrl][httpUrl] = JSON.parse(result);
        return JSON.parse(result);
      }
    }catch(e){
      logger.fatal(httpAction + httpUrl);
      logger.fatal(e.message);
      logger.fatal(result);
    }
    return true;
  }
  catch(e)
  {
    logger.fatal("Ajax Error, xhr.status: " + this.xhr.status + " "
      + this.xhr.statusText + ". \nRequest:\n" + httpAction + " "
      + httpUrl + "\n" + httpBody);
    logger.fatal(e.message);
    return false;
  }
}
/**
 * @param object The object to create on the server.
 *               It is updated with an _id (and a _rev if the
 *               server features conflict management).
 */
HtMap.prototype.httpPost = function(object) {
  var logger = Log4Moz.repository.getLogger("HtMap.httpPost");
  var body;
  try{
    body = this.send("POST", null, object);
    if(!body || !body.ok)
    {
      logger.fatal(object);
      return false;
    }
  }
  catch(e)
  {
    logger.fatal(object);
    logger.fatal(e);
    return false;
  }

  //Get object id from response result.
  object._id = body.id;
  return object;
}
/**
 * Notice: In-memory parser not suited to long payload.
 * @param query the path to get the view from the baseURL
 * @return if the queried object was like
 * {rows:[ {key:[key0, key1], value:{attribute0:value0}},
 * {key:[key0, key1], value:{attribute0:value1}}]}
 * then the returned object is
 * {key0:{key1:{attribute0:[value0, value1...]}}}
 * otherwise the original object is returned.
 */
HtMap.prototype.httpGet = function(query) {
  var logger = Log4Moz.repository.getLogger("HtMap.httpGet");
  var body;
  try{
    var url = this.baseUrl + query;
    if(query.indexOf("_") == 0)
      url = (this.baseUrl.indexOf("_design") > 0) ? this.baseUrl.substr(0,
                  this.baseUrl.indexOf("_design")) + query : this.baseUrl
                  + query;
    body = this.send("GET", url, null);
    if(!body)
      return false;
  }catch(e)
  {
    logger.fatal(query);
    logger.fatal(e);
    return false;
  }

  if(body.rows && body.rows.length > 0)
  {
    var rows = body.rows;
    var result = {};
    for(var i=0; i < rows.length; i++)
    {
      var r = rows[i];
      var keys = (typeof(r.key) == "string") ? [r.key] : r.key;
      var current = result;
      for(var k=0; k < keys.length; k++)
      {
        if(!current[keys[k]])
          current[keys[k]] = {};
        current = current[keys[k]];
      }
      var value = r.value;
      for(var attribute in value)
      {
        if(!current[attribute])
          current[attribute] = [];
        current[attribute].push(value[attribute]);
      }
    }
    body = result;
  }

  //logger.trace(body);
  return body;
}
/**
 * @param object the object to update on the server
 * (_id is mandatory, the server may need _rev for conflict management)
 * if the server features conflict management, the object is updated with _rev
 */
HtMap.prototype.httpPut = function(object) {
  var logger = Log4Moz.repository.getLogger("HtMap.httpPut");
  var url = this.baseUrl + object._id;
  try{
    var body = this.send("PUT", url, object);
    if(!body)
      throw Error(JSON.stringify(object));
  }catch(e)
  {
    logger.fatal(url);
    logger.fatal(object);
    logger.fatal(e);
    return false;
  }
  return object;
}
/**
 * @param object the object to delete on the server
 * (_id is mandatory, the server may need _rev for conflict management)
 */
HtMap.prototype.httpDelete = function(object) {
  var logger = Log4Moz.repository.getLogger("HtMap.httpDelete");

  var url;
  if(typeof(object) == "string")
    url = this.baseUrl + object;
  else
  {
    url = this.baseUrl + object._id;
    if(object._rev)
      url += "?rev=" + object._rev;
  }

  try{
    var body = this.send("DELETE", url, null);
    if(!body)
      throw Exception(JSON.stringify(object));
  }catch(e)
  {
    logger.fatal(url);
    logger.fatal(e);
    return false;
  }
  return true;
}

HtMap.prototype.getUser = function(userID) {
  userID = userID || this.user;
  return new HtMapUser(userID, this);
}

HtMap.prototype.getCorpus = function(corpusID) {
  //var logger = Log4Moz.repository.getLogger("HtMap.getCorpus");
  //logger.trace(corpusID);
  return new HtMapCorpus(corpusID, this);
}

HtMap.prototype.getItem = function(obj) {
  var logger = Log4Moz.repository.getLogger("HtMap.getItem");
  logger.trace(obj);
  if(typeof(obj) == "string")
  {
    var item = this.httpGet("item/?resource=" + encodeURIComponent(obj));

    logger.trace(item);
    if(!item || !item[obj] || !item[obj].item || !(item[obj].item.length > 0))
      return false;
    obj = item[obj].item[0];
    logger.trace(obj);
  }
  logger.trace(obj.corpus);
  logger.trace(obj.id);
  var corpus = 	this.getCorpus(obj.corpus);
  //logger.trace(corpus.getObject());
  //logger.trace(corpus.getItem(obj.id).getObject());
  return corpus.getItem(obj.id);
}

HtMap.prototype.getViewpoint = function(viewpointID) {
  //var logger = Log4Moz.repository.getLogger("HtMap.getViewpoint");
  //logger.debug(viewpointID);
  return new HtMapViewpoint(viewpointID, this);
}

HtMap.prototype.getTopic = function(topic) {
  //var logger = Log4Moz.repository.getLogger("HtMap.getTopic");
  var viewpoint = this.getViewpoint(topic.viewpoint);
  //logger.trace(viewpoint);
  return viewpoint.getTopic(topic);
}

HtMap.prototype.getHighlight = function(highlight) {
  //var logger = Log4Moz.repository.getLogger("HtMap.getHighlight");
  //logger.trace(highlight);
  var corpus = this.getCorpus(highlight.corpus);
  if(!corpus) return false;
  //logger.trace(corpus);
  var item = corpus.getItem(highlight.item);
  if(!item) return false;
  //logger.trace(item);
  //logger.trace(highlight.id);
  //logger.trace(item.getHighlight(highlight.id));
  return item.getHighlight(highlight.id);
}

HtMap.prototype.isReserved = function(key) {
	var reserved = {"highlight": null, "name": null, "resource": null,
	  "thumbnail": null, "topic": null, "upper": null, "user": null };
	return (key in reserved);
}

function HtMapUser(id, htMap) {
  this.id = id;
  this.htMap = htMap;
}

HtMapUser.prototype.getType = function() {
  return "HtMapUser";
}

HtMapUser.prototype.getID = function() {
  return this.id;
}

HtMapUser.prototype.getObject = function() { return getObject(this); }

HtMapUser.prototype.getView = function() {
  var ret = this.htMap.httpGet("user/" + this.getID());
  return (ret && ret[this.getID()]) ? ret[this.getID()] : false;
}

HtMapUser.prototype.listCorpora = function() {
  var view = this.getView();
  if(!view) return false;
  return view.corpus;
}

/**
 * @return a list of IDs and names pairs... fast!
 */
HtMapUser.prototype.listViewpoints = function() {
  var view = this.getView();
  if(!view) return false;
  return view.viewpoint;
}

HtMapUser.prototype.createCorpus = function(name) {
  //var logger = Log4Moz.repository.getLogger("HtMapUser.createCorpus");
  var corpus = {};
  corpus.corpus_name = name;
  corpus.users = new Array(this.getID());
  //logger.trace(corpus);
  var ret = this.htMap.httpPost(corpus);
  //logger.trace(ret);
  if(!ret) return false;
  //logger.trace(this.htMap.getCorpus(ret._id));
  return this.htMap.getCorpus(ret._id);
}

HtMapUser.prototype.createViewpoint = function(name) {
  //var logger = Log4Moz.repository.getLogger("HtMapUser.createViewpoint");
  var viewpoint = {};
  viewpoint.viewpoint_name = name;
  viewpoint.users = new Array(this.getID());
  //logger.trace(viewpoint);
  var ret = this.htMap.httpPost(viewpoint);
  //logger.trace(JSON.stringify(ret));
  if(!ret) return false;
  return this.htMap.getViewpoint(ret._id);
}

function HtMapCorpus(id, htMap) {
  this.id = id;
  this.htMap = htMap;
}
HtMapCorpus.prototype.getType = function() {
  return "HtMapCorpus";
}
HtMapCorpus.prototype.getID = function() {
  return this.id;
}

HtMapCorpus.prototype.getObject = function() { return getObject(this); }

HtMapCorpus.prototype.getView = function() {
  var ret = this.htMap.httpGet("corpus/" + this.getID());
  return (ret && ret[this.getID()]) ? ret[this.getID()] : false;
}
HtMapCorpus.prototype.getRaw = function() {
  return this.htMap.httpGet(this.getID());
}
HtMapCorpus.prototype.createWithID = function(corpusID, name) {
  var corpus = {};
  corpus._id = corpusID;
  corpus.corpus_name = name || corpusID;
  var ret = this.htMap.httpPost(corpus);
  if(!ret) return false;
  return this.htMap.getCorpus(ret._id);
}
HtMapCorpus.prototype.register = function(user) {
  var userID = (typeof(user) == "object") ? user.getID() : user;
  var corpus = this.htMap.httpGet(this.getID());
  if(!corpus) return false;
  if(!corpus.users) corpus.users = new Array();
  corpus.users.push(userID);
  this.htMap.httpPut(corpus);
}

HtMapCorpus.prototype.unregister = function(user) {
  var corpus = this.htMap.httpGet(this.getID());
  if(!corpus) return false;
  if(!corpus.users) return true;
  for(var i=0, el; el = corpus.users[i]; i++)
    if(el == user.getID())
    {
      corpus.users.splice(i, 1);
      i--;
    }

	this.htMap.httpPut(corpus);
}

HtMapCorpus.prototype.listUsers = function() {
  var view = this.getView();
  if(!view) return false;
  return (view.user) ? view.user : {};
}

/**
 * @return whole items contained in the corpus
 */
HtMapCorpus.prototype.getItems = function() {
  //var logger = Log4Moz.repository.getLogger("HtMapCorpus.getItems");
  var view = this.getView();
  if(!view) return false;
  //logger.trace(view);
  var result = new Array();
  for(var key in view)
    if(!this.htMap.isReserved(key))
    {
      //logger.trace(key);
      result.push(this.getItem(key));
    }
  return result;
}

HtMapCorpus.prototype.rename = function(name) {
  var ret = this.htMap.httpGet(this.getID());
  if(!ret) return false;
  ret.corpus_name = name;
  return this.htMap.httpPut(ret);
}

HtMapCorpus.prototype.getName = function() {
  var corpus = this.getView();
  if(!corpus || !corpus.name) return false;
  return corpus.name[0];
}

/**
 * Destroy the nodes of the corpus and of all its documents.
 */
HtMapCorpus.prototype.destroy = function() {
  //var logger = Log4Moz.repository.getLogger("HtMapCorpus.destroy");
  //logger.trace(this.getID());
	var items = this.getItems();
	if(!items) return true;
	for (var i=0, item; item = items[i]; i++) {
		item.destroy();
	}
	var corpus = this.htMap.httpGet(this.getID());
	var ret = this.htMap.httpDelete(corpus);
	if(!ret) return false;
	return true;
}


HtMapCorpus.prototype.createItem = function(name, itemID) {
  var item = {
    "item_name": name,
    "item_corpus": this.getID()
  };
  var ret;
  if(itemID) 
  {  
    item._id = itemID;
    ret = this.htMap.httpPut(item);
  }
  else
    ret = this.htMap.httpPost(item);
  if(!ret) return false;
  return this.getItem(ret._id);
}

HtMapCorpus.prototype.getItem = function(itemID) {
  return new HtMapItem(itemID, this);
}

function HtMapItem(itemID, Corpus) {
  this.Corpus = Corpus;
  this.id = itemID;
}
HtMapItem.prototype.getType = function() {
  return "HtMapItem";
}
HtMapItem.prototype.getID = function() {
  return this.id;
}

HtMapItem.prototype.getObject = function() { return getObject(this); }

HtMapItem.prototype.getView = function() {
  //var logger = Log4Moz.repository.getLogger("HtMapItem.getView");
  var corpusID = this.getCorpusID();
  var itemID = this.getID();
  var view = this.Corpus.htMap.httpGet("item/" + corpusID + "/" + itemID);
  //logger.debug("item/" + corpusID + "/" + itemID);
  //logger.debug(view);
  return (!view || typeof(view[corpusID]) != "object" || typeof(view[corpusID][itemID]) != "object") ? false : view[corpusID][itemID];
}

HtMapItem.prototype.getRaw = function() {
  return this.Corpus.htMap.httpGet(this.getID());
}

HtMapItem.prototype.getName = function() {
  var item = this.getView();
  return (item && item.name) ? item.name[0] : false;
}

HtMapItem.prototype.getCorpusID = function() {
  return this.Corpus.getID();
}

HtMapItem.prototype.destroy = function() {
  //var logger = Log4Moz.repository.getLogger("HtMapItem.destroy");
	var item = this.getRaw();
	var ret = this.Corpus.htMap.httpDelete(item);
	if(!ret) return false;
	return true;
}

HtMapItem.prototype.getResource = function() {
  //var logger = Log4Moz.repository.getLogger("HtMapItem.getResource");
	var view = this.getView();
  if(!view) return false;
	return (!view || !view.resource) ? false : view.resource[0];
}

HtMapItem.prototype.getAttributes = function() {
  //var logger = Log4Moz.repository.getLogger("HtMapItem.getAttributes");
  var item = this.getView();
  if(!item) return false;
  //logger.trace(item);
  var reserved = {"highlight": null, "resource": null, "thumbnail": null,
    "topic": null, "corpus": null, "speeches": null, "name": null };
  var result = new Array();
  for(var key in item)
    if(!(key in reserved) && !item[key].hasOwnProperty("coordinates"))
      result.push({"name": key, "value": item[key]});
  return result;
}

HtMapItem.prototype.getTopics = function() {
  //var logger = Log4Moz.repository.getLogger("HtMapItem.getTopics");
  var view = this.getView();
  if(!view) return false;
  //logger.trace(view);
  var result = new Array();
  if(view.topic)
    //logger.trace(view.topic);
    for(var topic, i=0; topic = view.topic[i]; i++)
      result.push(this.Corpus.htMap.getTopic(topic));
  return result;
}

HtMapItem.prototype.rename = function(name) {
  var item = this.Corpus.htMap.httpGet(this.getID());
  if(!item) return false;
  item.item_name = name;
  return this.Corpus.htMap.httpPut(item);
}

HtMapItem.prototype.describe = function(attribute, value) {
  var item = this.Corpus.htMap.httpGet(this.getID());
  if(!item) return false;
  if(!item[attribute])
    item[attribute] = value;
  else
    if(typeof(item[attribute]) == "string")
      item[attribute] = new Array(item[attribute], value);
    else
      if(item[attribute] instanceof Array && item[attribute].indexOf(value) < 0)
        item[attribute].push(value);
  return this.Corpus.htMap.httpPut(item);
}

HtMapItem.prototype.undescribe = function(attribute, value) {
  var item = this.Corpus.htMap.httpGet(this.getID());
  if(!item) return false;
  if(!item[attribute]) return true;
  if(typeof(item[attribute]) == "string" && item[attribute] == value)
    delete item[attribute];
  else
    if(item[attribute] instanceof Array && item[attribute].indexOf(value) > -1)
      for(var i=0, attr; attr = item[attribute][i]; i++)
        if(attr == value)
        {
          item[attribute].splice(i, 1);
          i--;
        }

  return this.Corpus.htMap.httpPut(item);
}

HtMapItem.prototype.tag = function(topic) {
  var item = this.Corpus.htMap.httpGet(this.getID());
  if(!item) return false;
  if(!item.topics) item.topics = {};
  item.topics[topic.getID()] = {"viewpoint": topic.getViewpointID() };
  return this.Corpus.htMap.httpPut(item);
}

HtMapItem.prototype.untag = function(topic) {
  var item = this.Corpus.htMap.httpGet(this.getID());
  if(!item) return false;
  if(!item.topics) return true;
  if(item.topics && item.topics[topic.getID()])
    delete item.topics[topic.getID()];

  var i=0;
  for each(var t in item.topics)
    i++;
  if(i == 0) delete item.topics;
  return this.Corpus.htMap.httpPut(item);
}

HtMapItem.prototype.createHighlight = function(topic, text, coordinates) {
  //var logger = Log4Moz.repository.getLogger("HtMapItem.createHighlight");
  //logger.trace(this.Corpus.htMap.serverType);
  var obj;
  if(this.Corpus.htMap.serverType  == "argos")
  {
    //logger.trace("itemID:" + this.getID());
    obj = this.getRaw();
  }
  else
    obj = this.Corpus.getRaw();

  if(!obj) return false;
  if(!obj.highlights) obj.highlights = {};

  var id = getUUID();
  obj.highlights[id] = {
    "coordinates" : coordinates,
    "text": text,
    "viewpoint": topic.getViewpointID(),
    "topic": topic.getID()
  };
  //logger.trace(obj);
  var ret = this.Corpus.htMap.httpPut(obj);

  if(!ret) return false;
  return this.getHighlight(id);
}

HtMapItem.prototype.getHighlights = function() {
  var logger = Log4Moz.repository.getLogger("HtMapItem.getHighlights");
	var result = new Array();
	var view = this.getView();
	logger.trace(view);
	/*if(!view.highlight || view.highlight.length == 0) return result;
    for(var i=0, highlight; highlight = view.highlight[i]; i++)
      result.push(new HtMapHighlight(highlight.id, this));*/
	for (var k in view) {
	  if(!view.hasOwnProperty(k)) continue;
	  if (!this.Corpus.htMap.isReserved(k) && typeof view[k] == "object" 
		  && view[k].hasOwnProperty("coordinates")) 
		  result.push(new HtMapHighlight(k, this));
	}
	return result;
}

HtMapItem.prototype.getHighlight = function(highlightID) {
  return new HtMapHighlight(highlightID, this);
}

function HtMapHighlight(highlightID, item) {
  this.id = highlightID;
  this.Item = item;
}
HtMapHighlight.prototype.getType = function() {
  return "HtMapHighlight";
}
HtMapHighlight.prototype.getID = function() {
  return this.id;
}

HtMapHighlight.prototype.getObject = function() { return getObject(this); }

HtMapHighlight.prototype.getView = function() {
  var logger = Log4Moz.repository.getLogger("HtMapHighlight.getView");
  var view = this.Item.getView();
  //logger.debug(view);
  //logger.debug(view[this.getID()]);
  return view[this.getID()] || false;
}

HtMapHighlight.prototype.getItemID = function() {
  return this.Item.getID();
}

HtMapHighlight.prototype.getCorpusID = function() {
  return this.Item.Corpus.getID();
}

HtMapHighlight.prototype.getTopic = function() {
  //var logger = Log4Moz.repository.getLogger("HtMapHighlight.getTopic");
  var view = this.getView();
  //logger.debug(view);
  if(!view) return false;
  //logger.debug(view.topic);
  return (view.topic && typeof(view.topic[0]) == 'object') ? view.topic[0] : false;
}
HtMapHighlight.prototype.moveToTopic = function(topicID) {
  var item = this.Item.Corpus.htMap.httpGet(this.getItemID());
  if(!item) return false;
  if(!item.highlights && !item.highlights[this.getID()]) return false;
  item.highlights[this.getID()].topic = topicID;
  return this.Item.Corpus.htMap.httpPut(item);
}

HtMapHighlight.prototype.getText = function() {
  //var logger = Log4Moz.repository.getLogger("HtMapHighlight.getText");
  var view = this.getView();
  if(!view) return false;
  //logger.debug(view);
  return (view.text) ? view.text + "" : false;
}

HtMapHighlight.prototype.getCoordinates = function() {
  var view = this.getView();
  if(!view) return false;
  return (typeof(view.coordinates[0]) == 'object') ? view.coordinates[0] : false;
}

HtMapHighlight.prototype.destroy = function() {
  //var logger = Log4Moz.repository.getLogger("HtMapHighlight.destroy");
  //logger.trace(this.Item.Corpus.htMap.serverType);
  var obj;
  if(this.Item.Corpus.htMap.serverType == "argos")
    obj = this.Item.Corpus.htMap.httpGet(this.getItemID());
  else
    obj = this.Item.Corpus.getRaw();

  if(!obj) return false;
  if(!obj.highlights && !obj.highlights[this.getID()]) return true;
  delete obj.highlights[this.getID()];
  //logger.trace(obj);
  return this.Item.Corpus.htMap.httpPut(obj);
}

function HtMapViewpoint(viewpointID, htMap) {
  this.id = viewpointID;
  this.htMap = htMap;
}
HtMapViewpoint.prototype.getType = function() {
  return "HtMapViewpoint";
}
HtMapViewpoint.prototype.getID = function() {
  return this.id;
}

HtMapViewpoint.prototype.getObject = function() { return getObject(this); }

HtMapViewpoint.prototype.getView = function() {
  var viewpoint = this.htMap.httpGet("viewpoint/" + this.getID());
  if(!viewpoint) return false;
  return viewpoint[this.getID()];
}

HtMapViewpoint.prototype.getRaw = function() {
  return this.htMap.httpGet(this.getID());
}

HtMapViewpoint.prototype.destroy = function() {
  var viewpoint = this.getRaw();
  if(!viewpoint) return false;
  return this.htMap.httpDelete(viewpoint);
}

HtMapViewpoint.prototype.register = function(user) {
  var viewpoint = this.getRaw();
  if(!viewpoint) return false;
  if(!viewpoint.users) viewpoint.users = new Array();
  viewpoint.users.push(user.getID());
  this.htMap.httpPut(viewpoint);
}

HtMapViewpoint.prototype.unregister = function(user) {
  var viewpoint = this.getRaw();
  if(!viewpoint) return false;
  if(!viewpoint.users) return true;
  for(var i=0, el; el = viewpoint.users[i]; i++)
    if(el == user.getID())
    {
      viewpoint.users.splice(i, 1);
      i--;
    }

	this.htMap.httpPut(viewpoint);
}

HtMapViewpoint.prototype.getName = function() {
  var viewpoint = this.getView();
  if(!viewpoint || !viewpoint.name) return false;
  return viewpoint.name[0];
}

HtMapViewpoint.prototype.getUpperTopics = function() {
  var result = new Array();
  var view = this.getView();
  if(!view) return false;
  if(!view.upper) return result;
  for(var i=0, topicID; topicID = view.upper[i]; i++)
    result.push(this.getTopic(topicID));
  return result;
}

HtMapViewpoint.prototype.getTopics = function() {
  //var logger = Log4Moz.repository.getLogger("HtMapViewpoint.getTopics");
  var result = new Array();
  var view = this.getView();
  //logger.trace(view);
  if(!view) return false;
  for(var k in view)
    if(!this.htMap.isReserved(k))
    {
      //logger.trace(k);
      //logger.trace(this.getTopic(k));
      result.push(this.getTopic(k));
    }
  return result;
}

HtMapViewpoint.prototype.getItems = function() {
  var result = new Array();
  var topics = this.getTopics();
  for(var i=0, topic; topic = topics[i]; i++)
  {
    var items = topic.getItems();
    for(var j=0, item; item = items[j]; j++)
      result.push(item);
  }
  return result;
}

HtMapViewpoint.prototype.getHighlights = function() {
  //var logger = Log4Moz.repository.getLogger("HtMapViewpoint.getHighlights");
  var result = new Array();
  var topics = this.getTopics();
  var highlightIDs = {};
  for(var i=0, topic; topic = topics[i]; i++)
  {
    //logger.trace(topic);
    var highlights = topic.getHighlights(false);
    //logger.trace(highlights);
    for(var j=0, highlight; highlight = highlights[j]; j++)
      if(!(highlight.id in highlightIDs))
      {
        //logger.trace(highlight);
        highlightIDs[highlight.id] = {};
        result.push(highlight);
      }
  }
  return result;
}

HtMapViewpoint.prototype.listUsers = function() {
  var view = this.getView();
  if(!view) return false;

  return (view.user) ? view.user : (new Array());
}

HtMapViewpoint.prototype.rename = function(name) {
  var viewpoint = this.getRaw();
  if(!viewpoint) return false;
  viewpoint.viewpoint_name = name;

	return this.htMap.httpPut(viewpoint);
}

HtMapViewpoint.prototype.createTopic = function(broaderTopics, name) {
  var logger = Log4Moz.repository.getLogger("HtMapViewpoint.createTopic");
  var topicID = getUUID();

  var viewpoint = this.getRaw();
  if(!viewpoint) return false;
  //logger.trace(viewpoint);

  var broader = new Array();
  if(broaderTopics)
  {
    //logger.trace(broaderTopics);
    //logger.trace((broaderTopics instanceof Array));
    if(typeof(broaderTopics.length) != "number")
      broaderTopics = new Array(broaderTopics);

    for(var i=0, topic; topic = broaderTopics[i]; i++)
      if(typeof(topic) == "string")
        broader.push(topic);
      else
        broader.push(topic.getID());

  }
  //logger.debug(broader);
  if(!viewpoint.topics)
    viewpoint.topics = {};

  viewpoint.topics[topicID] = {
    "broader": broader,
    "name": name
  };
  //logger.debug(viewpoint);

	var ret = this.htMap.httpPut(viewpoint);
	if(!ret) return false;
	return this.getTopic(topicID);
}

HtMapViewpoint.prototype.getTopic = function(topic) {
  if(typeof(topic) == "string")
    return new HtMapTopic(topic, this);
  else
    return new HtMapTopic(topic.id, this);
}

HtMapViewpoint.prototype.createGeneralTopic = function(topics, name) {
  var logger = Log4Moz.repository.getLogger("HtMapViewpoint.createGenerateTopic");
  name = name || 'no name';

  var shares;
  for(var i=0, topic; topic = topics[i]; i++) {
    var topic = this.getTopic(topic);
    var broaders = topic.getBroaders();
    //logger.debug(topic.getID());
    //logger.debug(broaders);
    
    if(!shares)
      shares = broaders
    else{
      shares = intersect(shares, broaders);
      //logger.debug(shares);
    }
    
    if(shares.length == 0)
      break;
  }
  //logger.debug(shares);
  var parent;
  if(shares.length > 0)
    parent = this.createTopic(new Array(shares[0]), name);
  else
    parent = this.createTopic(false, name);
  //logger.debug(parent);
  if(!parent) return false;
  var children = new Array();
  for(var i=0, topic; topic = topics[i]; i++) {
    children.push(this.getTopic(topic));
  }
  parent.moveTopics(children);
  return this.getTopic(parent.getID());
}

function HtMapTopic(topicID, viewpoint) {
  this.id = topicID;
  this.Viewpoint = viewpoint;
}
HtMapTopic.prototype.getType = function() {
  return "HtMapTopic";
}
HtMapTopic.prototype.getID = function() {
  return this.id;
}

HtMapTopic.prototype.getObject = function() { return getObject(this); }

HtMapTopic.prototype.getViewpointID = function() {
  return this.Viewpoint.getID();
}

HtMapTopic.prototype.getView = function() {
  var viewpoint = this.Viewpoint.getView();
  if(!viewpoint) return false;
  return viewpoint[this.getID()];
}

HtMapTopic.prototype.getName = function() {
  var topic = this.getView();
  if(!topic || !topic.name) return false;
  return (topic.name && topic.name[0])
            ? topic.name[0] : '';
}

HtMapTopic.prototype.getNarrower = function() {
  var logger = Log4Moz.repository.getLogger("HtMapTopic.getNarrower");
  var result = new Array();
  var view = this.getView();
  if(!view) return false;
  var narrower = view.narrower;
  //logger.debug(narrower);
  for each(var topic in narrower){
    //logger.debug(topic);
    result.push(this.Viewpoint.getTopic(topic));
  }
  //logger.debug(result.length);
  return result;
}

HtMapTopic.prototype.getBroader = function() {
  var result = new Array();
  var view = this.getView();
  if(!view) return false;
  var broader = view.broader;
  for each(var topic in broader)
    result.push(this.Viewpoint.getTopic(topic));
  return result;
}

HtMapTopic.prototype.getBroaders = function() {
  var result = new Array();
  var broaders = this.getBroader();
  for(var i=0, topic; topic = broaders[i]; i++){
    result.push(topic.getID());
    result = result.concat(topic.getBroaders());
  }
  return result;
}


/**
 * Recursive. Could be optimized with a cache.
 * Precondition: narrower topics graph must be acyclic.
 */
HtMapTopic.prototype.getItems = function() {
  //var logger = Log4Moz.repository.getLogger("HtMapTopic.getItems");
	var result = new Array();
  var topic = this.getView();
  if(!topic) return false;
  //logger.trace("start view");
  //logger.trace(topic);
  //logger.trace("end view");

  if(topic.item)
  	for each (var item in topic.item) {
  	  //logger.trace(item);
  		result.push(
  			this.Viewpoint.htMap.getItem(item)
  		);
  	}
	var narrower = topic.narrower;
	if(narrower)
    for(var i=0, nTopic; nTopic = narrower[i]; i++)
    {
      var topic = this.Viewpoint.getTopic(nTopic);
      //logger.trace("topic");
      //logger.trace(topic);
      //logger.trace("getItems");
      var items = topic.getItems();
      //logger.trace("items");
      //logger.trace(items);
      if(!items) continue;
      for(var j=0, item; item = items[j]; j++)
      {
        //logger.trace(getObject(item));
        result.push(item);

      }
    }
  //logger.trace("result");
  //logger.trace(result);
	return result;
}

HtMapTopic.prototype.getHighlights = function(recursion) {
  //var logger = Log4Moz.repository.getLogger("HtMapTopic.getHighlights");
	var result = new Array();
  var topic = this.getView();
  if(!topic) return false;
  //logger.trace(topic.highlight);
  if(topic.highlight instanceof Array)
  	for(var i=0, highlight; highlight = topic.highlight[i]; i++) {
  	  //logger.trace(this.Viewpoint.htMap.baseUrl);
  	  //logger.trace(this.Viewpoint.htMap.getHighlight(highlight));
  		result.push(
  			this.Viewpoint.htMap.getHighlight(highlight)
  		);
  	}
	logger.trace(result);
	if(!recursion) return result;

	var narrower = topic.narrower;
  for each(var t in narrower)
  {
    var topic = this.Viewpoint.getTopic(t);
    var highlights = topic.getHighlights(true);
    if(!highlights) continue;
    for(var i=0, highlight; highlight = highlights[i]; i++)
      result.push(highlight);
  }
	return result;
}

HtMapTopic.prototype.rename = function(name) {
  var viewpoint = this.Viewpoint.htMap.httpGet(this.Viewpoint.getID());
  if(!viewpoint) return false;
  if(!viewpoint.topics || !viewpoint.topics[this.getID()] ) return false;
  viewpoint.topics[this.getID()].name = name;
	return this.Viewpoint.htMap.httpPut(viewpoint);
}

HtMapTopic.prototype.destroy = function() {
  //var logger = Log4Moz.repository.getLogger("HtMapTopic.destroy");
  var viewpoint = this.Viewpoint.htMap.httpGet(this.Viewpoint.getID());
  if(!viewpoint) return false;
  if(!viewpoint.topics) return false;
  var topicID = this.getID();
  if(!viewpoint.topics || !viewpoint.topics[topicID] ) return false;
  //logger.trace(viewpoint);
  delete viewpoint.topics[topicID];
  for each(var topic in viewpoint.topics){
    if(topic.broader && topic.broader instanceof Array)
      for(var i=0, t; t = topic.broader[i]; i++)
        if(t == topicID)
        {
          topic.broader.splice(i, 1);
          i--;
        }
  }
  //logger.trace(viewpoint);
	return this.Viewpoint.htMap.httpPut(viewpoint);
}

HtMapTopic.prototype.moveTopics = function(narrowerTopics) {
  //var logger = Log4Moz.repository.getLogger("HtMapTopic.moveTopics");
  //logger.trace(narrowerTopics);
  //logger.trace(this.getID());
  var viewpoint = this.Viewpoint.htMap.httpGet(this.Viewpoint.getID());
  if(!viewpoint) return false;
  if(!viewpoint.topics) return false;
  if(!(narrowerTopics instanceof Array))
    narrowerTopics = new Array(narrowerTopics);
  for(var i=0, nTopic; nTopic = narrowerTopics[i]; i++)
  {
    if(!viewpoint.topics || !viewpoint.topics[nTopic.getID()] ) return false;
    viewpoint.topics[nTopic.getID()].broader = new Array(this.getID());
    //logger.trace(viewpoint.topics[nTopic.getID()].broader);
  }
  //logger.trace(viewpoint);
	return this.Viewpoint.htMap.httpPut(viewpoint);
}

/**
 * Unlink from broader topics
 */
HtMapTopic.prototype.unlink = function() {
  var viewpoint = this.Viewpoint.htMap.httpGet(this.Viewpoint.getID());
  if(!viewpoint) return false;
  if(!viewpoint.topics || !viewpoint.topics[this.getID()]) return false;
  viewpoint.topics[this.getID()].broader = new Array();
	return this.Viewpoint.htMap.httpPut(viewpoint);
}

HtMapTopic.prototype.linkTopics = function(narrowerTopics) {
  var viewpoint = this.Viewpoint.htMap.httpGet(this.Viewpoint.getID());
  if(!viewpoint) return false;
  if(!viewpoint.topics || !viewpoint.topics[this.getID()]) return false;
  for(var i=0, nTopic; nTopic = narrowerTopics[i]; i++)
  {
    if(!viewpoint.topics || !viewpoint.topics[nTopic.getID()] ) return false;
    if(!viewpoint.topics[nTopic.getID()].broader)
      viewpoint.topics[nTopic.getID()].broader = new Array();
    viewpoint.topics[nTopic.getID()].broader.push(this.getID());
  }
	return this.Viewpoint.htMap.httpPut(viewpoint);
}
