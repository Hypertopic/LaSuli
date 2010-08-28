//TODO, to be updated when Firefox 4 released.
const Cc = Components.classes;
const Ci = Components.interfaces;
const Cu = Components.utils;
const include = Cu.import;

include("resource://lasuli/modules/Services.js");
include("resource://lasuli/modules/Sync.js");
include("resource://lasuli/modules/log4moz.js");

onmessage = function(event) {
  var logger = Log4Moz.repository.getLogger("lasuli.notifywoker.onmessage");
  logger.level = Log4Moz.Level["Debug"];
  
  logger.info("onMessage");
  postMessage(event.data);
}