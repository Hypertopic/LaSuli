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

Array.prototype.remove = function(value)
{
  var j = 0;
  while (j < this.length)
    if (this[j] == value)
      this.splice(j, 1);
    else
      j++;
}

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
  }
}