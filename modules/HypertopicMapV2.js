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
let EXPORTED_SYMBOLS = ["HypertopicMapV2"];

const Exception = Components.Exception;
const Cc = Components.classes;
const Ci = Components.interfaces;
const Cu = Components.utils;
const include = Cu.import;

include("resource://lasuli/modules/log4moz.js");
include("resource://lasuli/modules/RESTDatabase.js");

let HypertopicMapV2 = {
  set baseUrl(url)
  {
    this._baseUrl = url;
  },
  get baseUrl()
  {
    return this._baseUrl;
  },
  
  set user(str)
  {
    this._user = str;
  },
  get user()
  {
    return this._user;
  },
  
  set pass(str)
  {
    this._pass = str;
  },
  get pass()
  {
    return this._pass;
  },
  
  
  init: function(){
    let logger = Log4Moz.repository.getLogger("HypertopicMapV2.init");
    let designDocument = this.designDocument || "_design/argos";
    RESTDatabase.init(this.baseUrl + designDocument + "/_rewrite/");
    logger.debug(this.baseUrl + designDocument + "/_rewrite/");
  },
  
  get : function(objectID) {
    return RESTDatabase.httpGet(objectID);
  },
  //====================================================================== CORPUS

  /**
   * @param user e.g. "cecile@hypertopic.org"
   */
  listCorpora : function(user) {
    let logger = Log4Moz.repository.getLogger("HypertopicMapV2.listCorpora");
    var obj = RESTDatabase.httpGet("user/" + user);
    if(!obj || !obj[user]) return false;
    logger.debug(obj);
    return obj[user].corpus;
  },
  
  getCorpus : function(corpusID) {
    let logger = Log4Moz.repository.getLogger("HypertopicMapV2.getCorpus");
    var obj = RESTDatabase.httpGet("corpus/" + corpusID);
    //logger.debug(corpusID);
    //logger.debug(obj);
    if(!obj) 
      return false;
    else
      return obj[corpusID];
  },
  
  /**
   * @return corpusID
   */
  createCorpus : function(name, user){
    var obj = {};
    obj.corpus_name = name;
    obj.users = [user];
    var result = RESTDatabase.httpPost(obj);
    return (!result) ? false : result._id;
  },
  
  renameCorpus : function(corpusID, name) {
    var obj = RESTDatabase.httpGet(corpusID);
    if(!obj) return false;
    obj.corpus_name = name;
    return RESTDatabase.httpPut(obj);
  },
  
  /**
   * Destroy the nodes of the corpus and of all its documents.
   */
  destroyCorpus : function(corpusID)
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
  },
  //======================================================================== ITEM
  /**
   * @param corpus e.g. "MISS"
   * @param item e.g. null, or "d0" to get only an item and its fragments
   */
  listItems : function(corpusID){
    var obj = this.getCorpus(corpusID);
    var items = [];
    for(var k in obj)
    {
      if(!"name" == k && !"user" == key)
        items.push(k);
    }
    return items;
  },
  
  getItem : function(corpusID, itemID) {
    var obj = this.getCorpus(corpusID);
    if(!obj) 
      return false;
    else
      return obj[itemID];
  },
  
  /**
   * @return itemID
   */
  createItem : function(name, corpusID) {
    var object = {};
    object.item_name = name;
    object.item_corpus = corpusID;
  
    var result = RESTDatabase.httpPost(object);
    return (!result) ? false : result._id;
  },
  
  destroyItem : function(itemID){
    var object = RESTDatabase.httpGet(itemID);
    if(!object)
     return false;
    return RESTDatabase.httpDelete(object);
  },
  
  listItemDescriptions : function(itemID)
  {
    var item = RESTDatabase.httpGet(itemID);
    if(!item) return false;
    delete item._id;
    delete item._rev;
    delete item.highlights;
    delete item.item_corpus;
    delete item.item_name;
    delete item.resource;
    delete item.topics;
    return item;
  },
  
  describeItem : function(itemID, attribute, value)
  {
    var item = RESTDatabase.httpGet(itemID);
    if(!item) return false;
    if(!item[attribute])
      item[attribute] = value;
    else{
      if(typeof(item[attribute]) == "string")
      {
        item[attribute] = new Array(item[attribute]);
      }
      item[attribute].push(value);
    }
    return RESTDatabase.httpPut(item);
  },
  
  undescribeItem : function(itemID, attribute, value)
  {
    var logger = Log4Moz.repository.getLogger("HypertopicMapV2.undescribeItem");
    var item = RESTDatabase.httpGet(itemID);
    logger.debug(item);
    if(!item[attribute]) return true;
    logger.debug(attribute + "," + value);
    if(typeof(item[attribute]) == "string")
    {
      if(item[attribute] == value) delete item[attribute];
    }
    else
    {
      while(item[attribute].indexOf(value) >=0 )
        item[attribute].splice(item[attribute].indexOf(value), 1);
      
      if(item[attribute].length == 0)
        delete item[attribute];
    }
    logger.debug(item);
    return RESTDatabase.httpPut(item);
  },
  
  tagItem : function(itemID, viewpointID, topicID)
  {
    var item = RESTDatabase.httpGet(itemID);
    if(!item) return false;
    if(!item.topics)
      item.topics = {};
    if(!item.topics[topicID])
      item.topics[topicID] = {};
    item.topics[topicID].viewpoint = viewpointID;
    return RESTDatabase.httpPut(item);
  },
  
  untagItem : function(itemID, viewpointID, topicID)
  {
    var item = RESTDatabase.httpGet(itemID);
    if(!item) return false;
    if(!item.topics || !item.topics[topicID]) return true;
    delete item.topics[topicID];
    return RESTDatabase.httpPut(item);
  },
  
  /**
   * @param itemID Note: replaced by a corpusID in Cassandre.
   * @return the ID of the highlight
   */
  tagFragment : function(itemID, coordinates, text, viewpointID, topicID)
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
  },
  
  //TODO need debug
  untagFragment : function(itemID, highlightID)
  {
    var item = RESTDatabase.httpGet(itemID);
    if(!item) return false;
    if(!item.highlights[highlightID]) return true;
    delete item.highlights[highlightID];
    return RESTDatabase.httpPut(item);
  },
  
  //=================================================================== VIEWPOINT
  /**
   * @param actor e.g. "cecile@hypertopic.org"
   */
  listViewpoints : function(user)
  {
    user = user || this.user;
    var result = RESTDatabase.httpGet("user/" + user);
    if(!result || !result[user]) return false;
    
    var obj = result[user];
    return (obj.viewpoint) ? obj.viewpoint : false;
  },
  
  getViewpoint : function(viewpointID)
  {
    var result = RESTDatabase.httpGet("viewpoint/" + viewpointID);
    if(!result || !result[viewpointID] ) return false;
    result[viewpointID].id = viewpointID;
    return result[viewpointID];
  },
  
  createViewpoint : function(name, user)
  {
    user = user || this.user;
    var viewpoint = {};
    viewpoint.viewpoint_name = name;
    viewpoint.users = [ user ];
  
    var result = RESTDatabase.httpPost(viewpoint);
    return (!result) ? false : result._id;
  },
  
  renameViewpoint : function(viewpointID, name)
  {
    var obj = RESTDatabase.httpGet(viewpointID);
    if(!obj) return false;
    obj.viewpoint_name = name;
    var result = RESTDatabase.httpPut(obj);
    //log(result, '[renameViewpoint] result');
    return (result) ? true : false;
  },
  
  destroyViewpoint : function(viewpointID)
  {
    var viewpoint = RESTDatabase.httpGet(viewpointID);
    if(!viewpoint) return false;
    return RESTDatabase.httpDelete(viewpoint);
  },
  //======================================================================= TOPIC

  /**
   * @param topicID null for the virtual root
   * @return an object with broader, narrower and name 
   */
  getTopic : function(viewpointID, topicID) 
  {
    var obj = this.getViewpoint(viewpointID);
    
    return (obj && obj[topicID]) ? obj[topicID] : false;
  },
  
  /**
   * @param topics can be empty
   * @return topic ID
   */
  createTopicIn : function(viewpointID, topicsIDs) 
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
  },
  
  renameTopic : function(viewpointID, topicID, name)
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
  },
  
  destroyTopic : function(viewpointID, topicID)
  {
    var viewpoint = RESTDatabase.httpGet(viewpointID);
    if(!viewpoint) return false;
    if(!viewpoint.topics || !viewpoint.topics[topicID]) return true;
    delete viewpoint.topics[topicID];
    
    for(var t in viewpoint.topics)
    {
      if(viewpoint.topics[t] && viewpoint.topics[t].broader && viewpoint.topics[t].broader.length > 0)
      {
        while(viewpoint.topics[t].broader.indexOf(topicID) >=0 )
          viewpoint.topics[t].broader.splice(viewpoint.topics[t].broader.indexOf(topicID), 1);
        
        if(viewpoint.topics[t].broader.length == 0)
          delete viewpoint.topics[t].broader;
      }
    }
    var result = RESTDatabase.httpPut(viewpoint);
    return (!result) ? false : result;
  },
  
  
  /**
   * @param topicID can be empty (to unlik from parents)
   */
  moveTopicsIn : function(topicsIDs, viewpointID, topicID) 
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
  },
  
  linkTopicsIn : function(topicsIDs, viewpointID, topicID) 
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
  },
  
  //==================================================================== RESOURCE
  /**
   * @param resource e.g. "http://cassandre/text/d0"
   */
  getResources : function(resource)
  {
    return RESTDatabase.httpGet("resource/" + encodeURIComponent(resource));
  },
  
  //==================================== GUID
  getUUID : function()
  {
    var uuidGenerator = 
      Components.classes["@mozilla.org/uuid-generator;1"]
              .getService(Components.interfaces.nsIUUIDGenerator);
    var uuid = uuidGenerator.generateUUID();
    var uuidString = uuid.toString();
    
    return uuidString.replace('{', '').replace('}', '').replace(/-/gi, '');
  }
}