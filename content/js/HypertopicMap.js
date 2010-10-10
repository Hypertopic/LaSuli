const Exception = Components.Exception;
const Cc = Components.classes;
const Ci = Components.interfaces;
const Cu = Components.utils;
const include = Cu.import;

include("resource://lasuli/modules/log4moz.js");
include("resource://lasuli/modules/XMLHttpRequest.js");
include("resource://lasuli/modules/Services.js");
include("resource://lasuli/modules/Sync.js");

function HtMap(baseUrl, user, pass)
{
  let logger = Log4Moz.repository.getLogger("HtMap");
  let regexp = /(http|https):\/\/(\w+:{0,1}\w*@)?(\S+)(:[0-9]+)?(\/|\/([\w#!:.?+=&%@!\-\/]))?/;

  //Check the baseUrl is a correct URL
  if(!baseUrl || baseUrl === "" || !regexp.test(baseUrl))
  {
      logger.fatal("BaseUrl is not a validate URL:" + baseUrl);
      throw URIError('baseUrl is not a vaildate URL!');
  }
  //If the baseUrl is not end with "/" append slash to the end.
  baseUrl = (baseUrl.substr(-1) == "/") ? baseUrl : baseUrl + "/";

  this.baseUrl = baseUrl;
  this.user = user || "";
  this.pass = pass || "";

  //Create the XMLHttpRequest object for HTTP requests
  this.xhr = new XMLHttpRequest();
  //Overrides the MIME type returned by the hypertopic service.
  this.xhr.overrideMimeType('application/json');

  //Initial the local cache
  this.cache = {};
  //Set to false to disable cache for debuging
  this.cache.enable = true;
}
/**
 * @param object null if method is GET or DELETE
 * @return response body
 */
HtMap.prototype.send = function(httpAction, httpUrl, httpBody){
  let logger = Log4Moz.repository.getLogger("HtMap.send");
  //Default HTTP action is "GET"
  httpAction = (httpAction) ? httpAction : "GET";
  //Default HTTP URL is the baseUrl
  httpUrl = (httpUrl) ? httpUrl : this.baseUrl;
  //Uncomment the following line to disable cache
  //httpUrl = (httpUrl.indexOf('?') > 0) ? httpUrl + "&_t=" + (new Date()).getTime() : httpUrl + "?_t=" + (new Date()).getTime();

  httpBody = (!httpBody) ? "" : ((typeof(httpBody) == "object") ? JSON.stringify(httpBody) : httpBody);
  let result = null;

  try{
    this.xhr.open(httpAction, httpUrl, false);
    //If there is a request body, set the content-type to json
    if(httpBody && httpBody != '')
      this.xhr.setRequestHeader('Content-Type', 'application/json');

    //If the request body is an object, serialize it to json
    if(typeof(httpBody) != 'string')
      httpBody = JSON.stringify(httpBody);

    this.xhr.send(httpBody);

    //If the response status code is not start with "2", there must be something wrong.
    if((this.xhr.status + "").substr(0,1) != '2')
    {
      logger.fatal(this.xhr.status);
      throw Error(httpAction + " " + httpUrl + "\nResponse: " + this.xhr.status);
    }
    result = this.xhr.responseText;
    return JSON.parse(result);
  }
  catch(e)
  {
    logger.fatal("Ajax Error, xhr.status: " + this.xhr.status + " " + this.xhr.statusText + ". \nRequest:\n" + httpAction + " " + httpUrl + "\n" + httpBody);
    throw Error(httpAction + " " + httpUrl + "\nResponse: " + this.xhr.status);
  }
}
/**
 * @param object The object to create on the server.
 *               It is updated with an _id (and a _rev if the server features conflict management).
 */
HtMap.prototype.httpPost = function(object) {
  let logger = Log4Moz.repository.getLogger("HtMap.httpPost");
  let body;
  try{
    body = this.send("POST", null, object);
    if(!body || !body.ok)
      throw Error(JSON.stringify(object));
  }
  catch(e)
  {
    logger.fatal(object);
    logger.fatal(e);
    throw e;
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
  let logger = Log4Moz.repository.getLogger("HtMap.httpGet");
  //Try to load the data from cache first
  if(this.cache[query] && this.cache.enable)
    return this.cache[query];
  logger.debug("load from server" + this.baseUrl + query);
  let body;
  try{
    body = this.send("GET", this.baseUrl + query, null);
    if(!body)
      throw Error(this.baseUrl + query);
  }catch(e)
  {
    logger.fatal(query);
    logger.fatal(e);
    throw e;
  }

  //TODO, need to rewrite this part of algorithm
  if(body.rows && body.rows.length > 0)
  {
    let rows = {};
    //Combine the array according to the index key.
    for(let i=0, row; row = body.rows[i]; i++)
    {
      let _key = JSON.stringify(row.key);
      if(!rows[_key])
        rows[_key] = new Array();
      rows[_key].push(row.value);
    }
    //Combine the value according to the value name.
    for(let _key in rows)
    {
      let obj = {};
      for(let i=0, val; val = rows[_key][i] ; i++)
      {
        for(let n in val)
        {
          if(!obj[n])
            obj[n] = new Array();
          obj[n].push(val[n]);
        }
      }
      rows[_key] = obj;
    }
    let result = {};

    for(let _key in rows)
    {
      let keys = JSON.parse(_key);
      let obj = null,tmp,key;
      if(typeof(keys) == "object")
        for(let i=keys.length-1; i >= 0; i--)
        {
          key = keys[i];
          if(obj == null)
          {
            obj = {};
            obj[key] = rows[_key];
            tmp = JSON.parse(JSON.stringify(obj));
          }
          else
          {
            obj = {};
            obj[key] = tmp;
            tmp = JSON.parse(JSON.stringify(obj));
          }
        }
      else
      {
        obj = {};
        obj[keys] = rows[_key];
      }
      result = MergeRecursive(result, obj);
    }
    body = result;
  }
  if(this.cache.enable) this.cache[query] = body;
  return body;
}
/**
 * @param object the object to update on the server
 * (_id is mandatory, the server may need _rev for conflict management)
 * if the server features conflict management, the object is updated with _rev
 */
HtMap.prototype.httpPut = function(object) {
  let logger = Log4Moz.repository.getLogger("HtMap.httpPut");
  let url = this.baseUrl + object._id;
  try{
    let body = this.send("PUT", url, object);
    if(!body)
      throw Error(JSON.stringify(object));
  }catch(e)
  {
    logger.fatal(url);
    logger.fatal(object);
    logger.fatal(e);
    throw e;
  }
  return object;
}

/**
 * @param object the object to delete on the server
 * (_id is mandatory, the server may need _rev for conflict management)
 */
HtMap.prototype.httpDelete = function(object) {
  let logger = Log4Moz.repository.getLogger("HtMap.httpDelete");
  let url = this.baseUrl + object._id;
  if(object._rev)
    url += "?rev=" + object._rev;

  try{
    let body = this.send("DELETE", url, null);
    if(!body)
      throw Exception(JSON.stringify(object));
  }catch(e)
  {
    logger.fatal(url);
    logger.fatal(e);
    throw e;
  }
  return true;
}

HtMap.prototype.getUser = function(userID){
  return new HtMapUser(userID);
}

function HtMapUser(id){
  this.id = id;
}

HtMapUser.prototype.getID = function(){
  return this.id;
}

HtMapUser.prototype.getView = function(){
  var ret = HtMap.httpGet("user/" + this.getID());
  return ret[this.getID()];
}