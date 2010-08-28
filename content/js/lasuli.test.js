const Cc = Components.classes;
const Ci = Components.interfaces;
const Cu = Components.utils;
const include = Cu.import;

var lasuli = {
  // Setup log4moz
  setupLogging: function() {
    // The basic formatter will output lines like:
    // DATE/TIME	LoggerName	LEVEL	(log message) 
    var formatter = new Log4Moz.BasicFormatter();
  
    // Loggers are hierarchical, lowering this log level will affect all output
    var root = Log4Moz.repository.rootLogger;
    if(root.appenders.length > 0) return;
    root.level = Log4Moz.Level["All"];
    
    /*var dapp = new Log4Moz.DumpAppender(formatter);
    dapp.level = Log4Moz.Level["Debug"];
    root.addAppender(dapp);*/
    
    var capp = new Log4Moz.ConsoleAppender(formatter);
    capp.level = Log4Moz.Level["All"];
    root.addAppender(capp);
    /*
    var logFile = getLocalDirectory();
    logFile.append("log.txt");
    var appender = new Log4Moz.RotatingFileAppender(logFile, formatter);
    appender.level = Log4Moz.Level["Debug"];
    root.addAppender(appender);*/
  }  
};
include("resource://lasuli/modules/log4moz.js");
include("resource://lasuli/modules/XMLHttpRequest.js");
include("resource://lasuli/modules/RESTDatabase.js");
include("resource://lasuli/modules/Services.js");
include("resource://lasuli/modules/Sync.js");
include("resource://gre/modules/NetUtil.jsm");

function notifyChanges(baseUrl)
{
  var logger = Log4Moz.repository.getLogger("RESTDatabase.notifyChanges");
  logger.level = Log4Moz.Level["Debug"];
  baseUrl = baseUrl || 'http://127.0.0.1/test/';
  baseUrl = baseUrl + "_changes?feed=continuous&heartbeat=5000";
  var channel = Services.io.newChannel(baseUrl, null, null);
  var aInputStream = channel.open();
  logger.info(typeof(aInputStream));
  var scriptableInputStream = Cc["@mozilla.org/scriptableinputstream;1"].createInstance(Ci.nsIScriptableInputStream);
  scriptableInputStream.init(aInputStream);
  while(1)
  {
    var str = scriptableInputStream.read(aInputStream.available());
    if(str.length == 0)
    {
      logger.error("empty!");
      break;
    }
    logger.info("result:" + str + str.length);
    Sync.sleep(3 * 1000);
  }
  logger.info("close");
  aInputStream.close();
  scriptableInputStream.close();
  setTimeout("notifyChanges()", 1000);
}

function initialize()
{
  lasuli.setupLogging();
  var logger = Log4Moz.repository.getLogger("LaSuli.Test");
  logger.level = Log4Moz.Level["All"];
  RESTDatabase.init('http://127.0.0.1/test/');
  
  //Create a new object
  var doc = {};
  doc.name = "Bond";
  
  var allDocs = RESTDatabase.httpGet("_all_docs?include_docs=true");
  var allDocs = RESTDatabase.httpGet("_all_docs?include_docs=true");
  var allDocs = RESTDatabase.httpGet("_all_docs?include_docs=true");
  Sync.sleep(2 * 1000);
  var allDocs = RESTDatabase.httpGet("_all_docs?include_docs=true");
  RESTDatabase.httpPost(doc);
  logger.info("update");
  Sync.sleep(2 * 1000);
  var allDocs = RESTDatabase.httpGet("_all_docs?include_docs=true");
  var allDocs = RESTDatabase.httpGet("_all_docs?include_docs=true");
  var allDocs = RESTDatabase.httpGet("_all_docs?include_docs=true");
  /*
  doc.name = "James Bond";
  db.httpPut(doc);
  logger.info(doc);
  
  allDocs = db.httpGet("_all_docs?include_docs=true");
  logger.info(allDocs);
  
  allDocs = db.httpGet("_all_docs?include_docs=true", true);
  logger.info(allDocs);
  
  db.httpDelete(doc);
  allDocs = db.httpGet("_all_docs?include_docs=true", true);
  logger.info(allDocs);
    
  var http = new XMLHttpRequest();
  http.open('GET', 'http://127.0.0.1/argos/', false);
  http.overrideMimeType('application/json');
  try{
    http.send('');
    var headers = http.getAllResponseHeaders();
    
    logger.info(headers);
    logger.fatal(http.status);
    logger.info(http.responseText);
  }catch(e)
  {
    logger.info(Log4Moz.enumerateProperties(e).join(","));
    
  }
  alert('test');*/
  
  //var url = "http://127.0.0.1/test/_changes?feed=continuous&heartbeat=5000";
  //var channel = Services.io.newChannel(url, null, null);
  /*NetUtil.asyncFetch(channel, function(aInputStream, aResult) {
    if (!Components.isSuccessCode(aResult)) {
      logger.error("Cannot load changes");
      return;
    }
    var scriptableInputStream = Cc["@mozilla.org/scriptableinputstream;1"].createInstance(Ci.nsIScriptableInputStream);
    scriptableInputStream.init(aInputStream);
    var str = scriptableInputStream.read(aInputStream.available());
    scriptableInputStream.close();
    aInputStream.close();
    logger.info(str);
  });*/
  
  /*var aInputStream = channel.open();
  logger.info(typeof(aInputStream));
  var scriptableInputStream = Cc["@mozilla.org/scriptableinputstream;1"].createInstance(Ci.nsIScriptableInputStream);
  scriptableInputStream.init(aInputStream);
  while(1)
  {
    logger.info("repeat");
    var str = scriptableInputStream.read(aInputStream.available());
    logger.info("result:" + str);
    Sync.sleep(10 * 1000);
  }
  logger.info("close");
  aInputStream.close();
  scriptableInputStream.close();
  */
  //setTimeout("notifyChanges()", 1000);

}


function shutdown()
{
  //delete RESTDatabase;
}

window.addEventListener("load", initialize, false);
window.addEventListener("unload", shutdown, false);