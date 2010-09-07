//========================================================= CORPUS OR VIEWPOINT

HypertopicMap.prototype.register = function(objectID, user) {
  var obj = RESTDatabase.httpGet(objectID);
  if(!obj) return false;
  if(obj.users)
  {  
    if(obj.users.indexOf(user) < 0) 
      obj.users.push(user);
  }
  else
    obj.users = [user];
    
  return RESTDatabase.httpPut(obj);
}

HypertopicMap.prototype.unregister = function(objectID, user) {
  var obj = RESTDatabase.httpGet(objectID);
  if(!obj) return false;
  if(!obj.users) return true;
  obj.users.remove(user);
  return RESTDatabase.httpPut(obj);
}

//====================================================================== CORPUS

/**
 * @param user e.g. "cecile@hypertopic.org"
 */
HypertopicMap.prototype.listCorpora = function(user) {
  var obj = RESTDatabase.httpGet("user/" + user);
  if(!obj) return false;
  return obj[user].corpus;
}

HypertopicMap.prototype.getCorpus = function(corpusID) {
  var obj = RESTDatabase.httpGet("corpus/" + corpusID);
  if(!obj) 
    return false;
  else
    return obj[corpusID];
}

/**
 * @return corpusID
 */
HypertopicMap.prototype.createCorpus = function(name, user){
  var obj = {};
  obj.corpus_name = name;
  obj.users = [user];
  var result = RESTDatabase.httpPost(obj);
  return (!result) ? false : result._id;
}

HypertopicMap.prototype.renameCorpus = function(corpusID, name) {
  var obj = RESTDatabase.httpGet(corpusID);
  if(!obj) return false;
  obj.corpus_name = name;
  return RESTDatabase.httpPut(obj);
}

/**
 * Destroy the nodes of the corpus and of all its documents.
 */
HypertopicMap.prototype.destroyCorpus = function(corpusID)
{
  //TODO
  log(corpusID, "[destroyCorpus] corpusID");
  var obj = RESTDatabase.httpGet(corpusID);
  if(!obj) return false;

  log(obj, "[destroyCorpus] obj");
  var result = RESTDatabase.httpDelete(obj);
  if(!result) return false;
  
  var items = this.listItems(corpusID);
  log(items, "[destroyCorpus] items");
  for(var i=0, documentID; documentID = items[i]; i++)
  {
    log(documentID, "[destroyCorpus] documentID");
    var obj = RESTDatabase.httpGet(documentID);
    if(!obj) continue;
    RESTDatabase.httpDelete(obj);
  }
  return true;
}

//======================================================================== ITEM
/**
 * @param corpus e.g. "MISS"
 * @param item e.g. null, or "d0" to get only an item and its fragments
 */
HypertopicMap.prototype.listItems = function(corpusID){
  var obj = this.getCorpus(corpusID);
  var items = [];
  for(var k in obj)
  {
    if(!"name" == k && !"user" == key)
      items.push(k);
  }
  return items;
}

HypertopicMap.prototype.getItem = function(corpusID, itemID) {
  var obj = this.getCorpus(corpusID);
  if(!obj) 
    return false;
  else
    return obj[itemID];
}

/**
 * @return itemID
 */
HypertopicMap.prototype.createItem = function(name, corpusID) {
  var object = {};
  object.item_name = name;
  object.item_corpus = corpusID;

  var result = RESTDatabase.httpPost(object);
  return (!result) ? false : result._id;
}

HypertopicMap.prototype.destroyItem = function(itemID){
  var object = RESTDatabase.httpGet(itemID);
  if(!object)
   return false;
  return RESTDatabase.httpDelete(object);
}

HypertopicMap.prototype.describeItem = function(itemID, attribute, value)
{
  var item = RESTDatabase.httpGet(itemID);
  if(!item) return false;
  if(!item[attribute])
    item[attribute] = new Array();
  item[attribute].push(value);
  return RESTDatabase.httpPut(item);
}

HypertopicMap.prototype.undescribeItem = function(itemID, attribute, value)
{
  var item = RESTDatabase.httpGet(itemID);
  if(!item[attribute] || !(item[attribute].length > 0)) return true;
  item[attribute].remove(value);
  if(item[attribute].length == 0)
    delete item[attribute];
  return RESTDatabase.httpPut(item);
}

HypertopicMap.prototype.tagItem = function(itemID, viewpointID, topicID)
{
  var item = RESTDatabase.httpGet(itemID);
  if(!item) return false;
  if(!item.topics)
    item.topics = {};
  if(!item.topics[topicID])
    item.topics[topicID] = {};
  item.topics[topicID].viewpoint = viewpointID;
  return RESTDatabase.httpPut(item);
}

HypertopicMap.prototype.untagItem = function(itemID, viewpointID, topicID)
{
  var item = RESTDatabase.httpGet(itemID);
  if(!item) return false;
  if(!item.topics || !item.topics[topicID]) return true;
  delete item.topics[topicID];
  return RESTDatabase.httpPut(item);
}

/**
 * @param itemID Note: replaced by a corpusID in Cassandre.
 * @return the ID of the highlight
 */
HypertopicMap.prototype.tagFragment = function(itemID, coordinates, text, viewpointID, topicID)
{
  var item = RESTDatabase.httpGet(itemID);
  if(!item) return false;
  
  if (!item.highlights)
    item.highlights = {};

  var highlights = {};
  highlights.coordinates = coordinates;
  highlights.text = text;
  highlights.viewpoint = viewpointID;
  highlights.topic = topicID;
  
  var highlightID = this.getUUID();
  item.highlights[highlightID] = highlights;
  RESTDatabase.httpPut(item);
  return highlightID;
}

HypertopicMap.prototype.untagFragment = function(itemID, highlightID)
{
  var item = RESTDatabase.httpGet(itemID);
  if(!item) return false;
  if(!item.highlights[highlightID]) return true;
  delete item.highlights[highlightID];
  return RESTDatabase.httpPut(item);
}

//=================================================================== VIEWPOINT

/**
 * @param actor e.g. "cecile@hypertopic.org"
 */
HypertopicMap.prototype.listViewpoints = function(user)
{
  var result = RESTDatabase.httpGet("user/" + user);
  if(!result || !result[user]) return false;
  
  var obj = result[user];
  return (obj.viewpoint) ? obj.viewpoint : false;
}

HypertopicMap.prototype.getViewpoint = function(viewpointID)
{
  var result = RESTDatabase.httpGet("viewpoint/" + viewpointID);
  if(!result || !result[viewpointID] ) return false;
  
  return result[viewpointID];
}

HypertopicMap.prototype.createViewpoint = function(name, user)
{
  
  var viewpoint = {};
  viewpoint.viewpoint_name = name;
  viewpoint.users = [ user ];

  var result = RESTDatabase.httpPost(viewpoint);
  return (!result) ? false : result._id;
}

HypertopicMap.prototype.renameViewpoint = function(viewpointID, name)
{
  var obj = RESTDatabase.httpGet(viewpointID);
  if(!obj) return false;
  obj.viewpoint_name = name;
  var result = RESTDatabase.httpPut(obj);
  //log(result, '[renameViewpoint] result');
  return (result) ? true : false;
}

HypertopicMap.prototype.destroyViewpoint = function(viewpointID)
{
  var viewpoint = RESTDatabase.httpGet(viewpointID);
  if(!viewpoint) return false;
  return RESTDatabase.httpDelete(viewpoint);
}

//TODO importViewpoint(XML, viewpointID?)
//TODO XML exportViewpoint(viewpointID)

//======================================================================= TOPIC

/**
 * @param topicID null for the virtual root
 * @return an object with broader, narrower and name 
 */
HypertopicMap.prototype.getTopic = function(viewpointID, topicID) 
{
  var obj = this.getViewpoint(viewpointID);
  log(obj, "[getTopic] obj:");
  log(topicID, "[getTopic] topicID:");
  
  return (obj && obj[topicID]) ? obj[topicID] : false;
}

/**
 * @param topics can be empty
 * @return topic ID
 */
HypertopicMap.prototype.createTopicIn = function(viewpointID, topicsIDs) 
{
  var topicID = this.getUUID();
  var viewpoint = RESTDatabase.httpGet(viewpointID);
  if(!viewpoint) return false;
  
  if(!viewpoint.topics)
    viewpoint.topics = {};
  if(!viewpoint.topics[topicID])
    viewpoint.topics[topicID] = {};
  viewpoint.topics[topicID].broader = topicsIDs;
  var result = RESTDatabase.httpPut(viewpoint);
  return (!result) ? false : topicID;
}

HypertopicMap.prototype.renameTopic = function(viewpointID, topicID, name)
{
  var viewpoint = RESTDatabase.httpGet(viewpointID);
  if(!viewpoint) return false;
  
  if(!viewpoint.topics)
    viewpoint.topics = {};
  if(!viewpoint.topics[topicID])
    viewpoint.topics[topicID] = {};
  viewpoint.topics[topicID].name = name;
  var result = RESTDatabase.httpPut(viewpoint);
  return (!result) ? false : result;
}

HypertopicMap.prototype.destroyTopic = function(viewpointID, topicID)
{
  var viewpoint = RESTDatabase.httpGet(viewpointID);
  if(!viewpoint) return false;
  if(!viewpoint.topics || !viewpoint.topics[topicID]) return true;
  delete viewpoint.topics[topicID];
  
  for(var t in viewpoint.topics)
  {
    if(viewpoint.topics[t] && viewpoint.topics[t].broader && viewpoint.topics[t].broader.length > 0)
      viewpoint.topics[t].broader.remove(topicID);
  }
  var result = RESTDatabase.httpPut(viewpoint);
  return (!result) ? false : result;
}


/**
 * @param topicID can be empty (to unlik from parents)
 */
HypertopicMap.prototype.moveTopicsIn = function(topicsIDs, viewpointID, topicID) 
{
  var viewpoint = RESTDatabase.httpGet(viewpointID);
  if(!viewpoint) return false;
  
  if(!viewpoint.topics) viewpoint.topics = {};
  
  for(var i=0, t; t = topicsIDs[i]; i++)
  {
    if(!viewpoint.topics[t]) viewpoint.topics[t] = {};
    
    viewpoint.topics[t].broader = new Array(topicID);
  }
  var result = RESTDatabase.httpPut(viewpoint);
  return (!result) ? false : result;
}

HypertopicMap.prototype.linkTopicsIn = function(topicsIDs, viewpointID, topicID) 
{
  var viewpoint = RESTDatabase.httpGet(viewpointID);
  if(!viewpoint) return false;
  
  if(!viewpoint.topics) viewpoint.topics = {};
  
  for(var i=0, t; t = topicsIDs[i]; i++)
  {
    if(!viewpoint.topics[t]) viewpoint.topics[t] = {};
    if(!viewpoint.topics[t].broader) viewpoint.topics[t].broader = new Array();
    
    viewpoint.topics[t].broader.push(topicID);
  }
  var result = RESTDatabase.httpPut(viewpoint);
  return (!result) ? false : result;
}

//==================================================================== RESOURCE

/**
 * @param resource e.g. "http://cassandre/text/d0"
 */
HypertopicMap.prototype.getResources = function(resource)
{
  return RESTDatabase.httpGet("resource/?resource=" + encodeURIComponent(resource));
}

//<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<< HypertopicMap

HypertopicMap.prototype.getUUID = function()
{
  var uuidGenerator = 
    Components.classes["@mozilla.org/uuid-generator;1"]
            .getService(Components.interfaces.nsIUUIDGenerator);
  var uuid = uuidGenerator.generateUUID();
  var uuidString = uuid.toString();
  
  return uuidString.replace('{', '').replace('}', '').replace(/-/gi, '');
}