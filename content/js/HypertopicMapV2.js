/*
HYPERTOPIC - Infrastructure for community-driven knowledge organization systems

OFFICIAL WEB SITE
http://www.hypertopic.org/

Copyright (C) 2010 Chao ZHOU, Aurelien Benel.

LEGAL ISSUES
This library is free software; you can redistribute it and/or modify it under
the terms of the GNU Lesser General Public License as published by the Free 
Software Foundation, either version 3 of the license, or (at your option) any
later version.
This library is distributed in the hope that it will be useful, but WITHOUT ANY
WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR A
PARTICULAR PURPOSE. See the GNU Lesser General Public License for more details:
http://www.gnu.org/licenses/lgpl.html
*/

function HypertopicMapV2(baseUrl)
{
  this.db = new RESTDatabase(baseUrl);
}

//========================================================= CORPUS OR VIEWPOINT

HypertopicMapV2.prototype.register = function(objectID, user) {
  var obj = this.db.get(objectID);
  if(!obj) return false;
  if(obj.users)
  {  
    if(obj.users.indexOf(user) < 0) 
      obj.users.push(user);
  }
  else
    obj.users = [user];
    
  return this.db.put(obj);
}

HypertopicMapV2.prototype.unregister = function(objectID, user) {
  var obj = this.db.get(objectID);
  if(!obj) return false;
  if(!obj.users) return true;
  obj.users.remove(user);
  return this.db.put(obj);
}

//====================================================================== CORPUS

/**
 * @param user e.g. "cecile@hypertopic.org"
 */
HypertopicMapV2.prototype.listCorpora = function(user) {
  var obj = this.db.get("user/" + user);
  if(!obj) return false;
  return obj[user].corpus;
}

HypertopicMapV2.prototype.getCorpus = function(corpusID) {
  var obj = this.db.get("corpus/" + corpusID);
  if(!obj) 
    return false;
  else
    return obj[corpusID];
}

/**
 * @return corpusID
 */
HypertopicMapV2.prototype.createCorpus = function(name, user){
  var obj = {};
  obj.corpus_name = name;
  obj.users = [user];
  var result = this.db.post(obj);
  return (!result) ? false : result._id;
}

HypertopicMapV2.prototype.renameCorpus = function(corpusID, name) {
  var obj = this.db.get(corpusID);
  if(!obj) return false;
  obj.corpus_name = name;
  return this.db.put(obj);
}

/**
 * Destroy the nodes of the corpus and of all its documents.
 */
HypertopicMapV2.prototype.destroyCorpus = function(corpusID)
{
  //TODO
  log(corpusID, "[destroyCorpus] corpusID");
  var obj = this.db.get(corpusID);
  if(!obj) return false;

  log(obj, "[destroyCorpus] obj");
  var result = this.db.delete(obj);
  if(!result) return false;
  
  var items = this.listItems(corpusID);
  log(items, "[destroyCorpus] items");
  for(var i=0, documentID; documentID = items[i]; i++)
  {
    log(documentID, "[destroyCorpus] documentID");
    var obj = this.db.get(documentID);
    if(!obj) continue;
    this.db.delete(obj);
  }
  return true;
}

//======================================================================== ITEM
/**
 * @param corpus e.g. "MISS"
 * @param item e.g. null, or "d0" to get only an item and its fragments
 */
HypertopicMapV2.prototype.listItems = function(corpusID){
  var obj = this.getCorpus(corpusID);
  var items = [];
  for(var k in obj)
  {
    if(!"name" == k && !"user" == key)
      items.push(k);
  }
  return items;
}

HypertopicMapV2.prototype.getItem = function(corpusID, itemID) {
  var obj = this.getCorpus(corpusID);
  if(!obj) 
    return false;
  else
    return obj[itemID];
}

/**
 * @return itemID
 */
HypertopicMapV2.prototype.createItem = function(name, corpusID) {
  var object = {};
  object.item_name = name;
  object.item_corpus = corpusID;

  var result = this.db.post(object);
  return (!result) ? false : result._id;
}

HypertopicMapV2.prototype.destroyItem = function(itemID){
  var object = this.db.get(itemID);
  if(!object)
   return false;
  return this.db.delete(object);
}

HypertopicMapV2.prototype.describeItem = function(itemID, attribute, value)
{
  var item = this.db.get(itemID);
  if(!item) return false;
  if(!item[attribute])
    item[attribute] = {};
  item[attribute].push(value);
  return this.db.put(item);
}

HypertopicMapV2.prototype.undescribeItem = function(itemID, attribute, value)
{
  var item = this.db.get(itemID);
  if(item[attribute] && !item[attribute].length > 0) return;
  item[attribute].remove(value);
  if(item[attribute].length == 0)
    delete item[attribute];
  this.db.put(item);
}

HypertopicMapV2.prototype.tagItem = function(itemID, viewpointID, topicID)
{
  var item = this.db.get(itemID);
  if(!item) return false;
  if(!item.topics)
    item.topics = {};
  if(!item.topics[topicID])
    item.topics[topicID] = {};
  item.topics[topicID].viewpoint = viewpointID;
  return this.db.put(item);
}

HypertopicMapV2.prototype.untagItem = function(itemID, viewpointID, topicID)
{
  var item = this.db.get(itemID);
  if(!item) return false;
  if(!item.topics || !item.topics[topicID]) return true;
  delete item.topics[topicID];
  return this.db.put(item);
}

/**
 * @param itemID Note: replaced by a corpusID in Cassandre.
 * @return the ID of the highlight
 */
HypertopicMapV2.prototype.tagFragment = function(itemID, coordinates, text, viewpointID, topicID)
{
  var item = this.db.get(itemID);
  if(!item) return false;
  
  if (!item.highlights)
    item.highlights = {};

  var highlights = {};
  highlights.coordinates = coordinates;
  highlights.text = text;
  highlights.viewpoint = viewpoint;
  highlights.topic = topic;
  
  var highlightID = radomUUID();
  item.highlights[highlightID] = highlights;
  this.db.put(item);
  return highlightID;
}

HypertopicMapV2.prototype.untagFragment = function(itemID, coordinates, viewpointID, topicID)
{
  var item = this.db.get(itemID);
  if(!item) return false;
  if(!item.highlights[highlightID]) return true;
  delete item.highlights[highlightID];
  return this.db.put(item);
}

//=================================================================== VIEWPOINT

/**
 * @param actor e.g. "cecile@hypertopic.org"
 */
HypertopicMapV2.prototype.listViewpoints = function(user)
{
	var result = this.db.get("user/" + user);
	if(!result || !result[user]) return false;
	
	var obj = result[user];
	return (obj.viewpoint) ? obj.viewpoint : false;
}

HypertopicMapV2.prototype.getViewpoint = function(viewpointID)
{
  var result = this.db.get("viewpoint/" + viewpointID);
  if(!result || !result[viewpointID] ) return false;
  
  return result[viewpointID];
}

HypertopicMapV2.prototype.createViewpoint = function(name, user)
{
  
  var viewpoint = {};
  viewpoint.viewpoint_name = name;
  viewpoint.users = [ user ];

  var result = this.db.post(viewpoint);
  return (!result) ? false : result._id;
}

HypertopicMapV2.prototype.renameViewpoint = function(viewpointID, name)
{
  var obj = this.db.get(viewpointID);
  if(!obj) return false;
  obj.viewpoint_name = name;
  var result = this.db.put(obj);
  //log(result, '[renameViewpoint] result');
  return (result) ? true : false;
}

HypertopicMapV2.prototype.destroyViewpoint = function(viewpointID)
{
  var viewpoint = this.db.get(viewpointID);
  if(!viewpoint) return false;
  return this.db.delete(viewpoint);
}

//TODO importViewpoint(XML, viewpointID?)
//TODO XML exportViewpoint(viewpointID)

//======================================================================= TOPIC

/**
 * @param topicID null for the virtual root
 * @return an object with broader, narrower and name 
 */
HypertopicMapV2.prototype.getTopic = function(viewpointID, topicID) 
{
	var obj = this.getViewpoint(viewpointID);
	return (obj && obj[topicID]) ? obj[topicID] : false;
}

/**
 * @param topics can be empty
 * @return topic ID
 */
HypertopicMapV2.prototype.createTopicIn = function(viewpointID, topicsIDs) 
{
	var topicID = randomUUID();
	var viewpoint = this.db.get(viewpointID);
	if(!viewpoint) return false;
	
	if(!viewpoint.topics)
	  viewpoint.topics = {};
	if(!viewpoint.topics[topicID])
	  viewpoint.topics[topicID] = {};
	viewpoint.topics[topicID].broader = topicsIDs;
	var result = this.db.put(viewpoint);
	return (!result) ? false : result;
}

HypertopicMapV2.prototype.renameTopic = function(viewpointID, topicID, name)
{
  var viewpoint = this.db.get(viewpointID);
	if(!viewpoint) return false;
	
	if(!viewpoint.topics)
	  viewpoint.topics = {};
	if(!viewpoint.topics[topicID])
	  viewpoint.topics[topicID] = {};
  viewpoint.topics[topicID].name = name;
	var result = this.db.put(viewpoint);
	return (!result) ? false : result;
}

HypertopicMapV2.prototype.destroyTopic = function(viewpointID, topicID)
{
	var viewpoint = this.db.get(viewpointID);
	if(!viewpoint) return false;
	if(!viewpoint.topics || !viewpoint.topics[topicID]) return true;
	delete viewpoint.topics[topicID];
	
	for(var t in viewpoint.topics)
	{
	  if(viewpoint.topics[t] && viewpoint.topics[t].broader && viewpoint.topics[t].broader.length > 0)
	    viewpoint.topics[t].broader.remove(topicID);
	}
	var result = this.db.put(viewpoint);
	return (!result) ? false : result;
}


/**
 * @param topicID can be empty (to unlik from parents)
 */
HypertopicMapV2.prototype.moveTopicsIn = function(topicsIDs, viewpointID, topicID) 
{
	var viewpoint = this.db.get(viewpointID);
	if(!viewpoint) return false;
	
	if(!viewpoint.topics) viewpoint.topics = {};
	
	for(var i=0, t; t = topicsIDs[i]; i++)
	{
	  if(!viewpoint.topics[t]) viewpoint.topics[t] = {};
	  
	  viewpoint.topics[t].broader = new Array(topicID);
	}
	var result = this.db.put(viewpoint);
	return (!result) ? false : result;
}

HypertopicMapV2.prototype.linkTopicsIn = function(topicsIDs, viewpointID, topicID) 
{
	var viewpoint = this.db.get(viewpointID);
	if(!viewpoint) return false;
	
	if(!viewpoint.topics) viewpoint.topics = {};
	
	for(var i=0, t; t = topicsIDs[i]; i++)
	{
	  if(!viewpoint.topics[t]) viewpoint.topics[t] = {};
	  if(!viewpoint.topics[t].broader) viewpoint.topics[t].broader = new Array();
	  
	  viewpoint.topics[t].broader.push(topicID);
	}
	var result = this.db.put(viewpoint);
	return (!result) ? false : result;
}

//==================================================================== RESOURCE

/**
 * @param resource e.g. "http://cassandre/text/d0"
 */
HypertopicMapV2.prototype.getResources = function(resource)
{
  return this.db.get("resource/?resource=" + encodeURIComponent(resource));
}

//<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<< HypertopicMapV2