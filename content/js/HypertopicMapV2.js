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
  var obj = this.db.get(corpusID);
  if(!obj) return false;

  var result = this.db.delete(obj);
  if(!result) return false;
  
  var items = this.listItems(corpusID);
  for(var documentID in items)
  {
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
  if(!obj) return false;
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
  this.db.delete(object);
}

HypertopicMapV2.prototype.describeItem = function(itemID, attribute, value)
{
  var item = this.db.get(itemID);
  item.attribute.push(value);
  this.db.put(item);
}

HypertopicMapV2.prototype.undescribeItem = function(itemID, attribute, value)
{
  var item = this.db.get(itemID);
  item.attribute.remove(value);
  this.db.put(item);
}

HypertopicMapV2.prototype.tagItem = function(itemID, viewpointID, topicID)
{
  var item = this.db.get(itemID);
  if(!item.topics)
    item.topics = {};
  if(!item.topics[topicID])
    item.topics[topicID] = {};
  item.topics[topicID].viewpoint = viewpointID;
  return this.db.put(item);
}

HypertopicMapV2.prototype.untagItem = function(itemID, viewpointID, topicID)
{
//TODO
}


HypertopicMapV2.prototype.tagFragment = function(itemID, coordinates, text, viewpointID, topicID)
{
  var item = this.db.get(itemID);
  var fragments = item.fragments;
  if (fragments==null)
    item.fragments = {};

  if (!item.fragments[coordinates]) {
    item.fragments[coordinates] = {};
    item.fragments[coordinates].text = text;
  }

  if (!item.fragments[coordinates].topics) {
    item.fragments[coordinates].topics = {};
    item.fragments[coordinates].topics = topics;
  }
  item.fragments[coordinates].topics[viewpointID] = topicID;
  this.db.put(item);
}


HypertopicMapV2.prototype.untagFragment = function(itemID, coordinates, viewpointID, topicID)
{
  var item = this.db.get(itemID);
  if(item.fragments[coordinates] && item.fragments[coordinates].topics)
    delete item.fragments[coordinates].topics[viewpointID];

  this.db.put(item);
}

//=================================================================== VIEWPOINT

/**
 * @param actor e.g. "cecile@hypertopic.org"
 */
HypertopicMapV2.prototype.listViewpoints = function(actor)
{
  return this.db.get("viewpoint/?actor=" + actor);
}

HypertopicMapV2.prototype.createViewpoint = function(name, actor)
{
  var viewpoint = {};
  viewpoint.viewpoint_name = name;
  viewpoint.actors = [ actor ];

  var result = this.db.post(viewpoint);
  return (!result) ? false : result._id;
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
//TODO
}

//==================================================================== RESOURCE

/**
 * @param resource e.g. "http://cassandre/text/d0"
 */
HypertopicMapV2.prototype.getResources = function(resource)
{
  return this.db.get("resource/?resource=" + resource);
}
