let EXPORTED_SYMBOLS = ["Changes"];

const Exception = Components.Exception;
const Cc = Components.classes;
const Ci = Components.interfaces;
const Cu = Components.utils;
const include = Cu.import;

include("resource://lasuli/modules/log4moz.js");
include("resource://lasuli/modules/XMLHttpRequest.js");
include("resource://lasuli/modules/Services.js");
include("resource://lasuli/modules/Sync.js");

function Changes(baseUrl, lastSeq){
  this._baseUrl = baseUrl;
  this._lastSeq = lastSeq;
  setTimeout("Changes.notify('" + baseUrl + "'," + lastSeq + ")", 1000);
}

Changes.prototype = {
  listen : function(baseUrl, lastSeq)
  {
    let logger = Log4Moz.repository.getLogger("Changes.notify");
    logger.info(RESTDatabase);
  }
}