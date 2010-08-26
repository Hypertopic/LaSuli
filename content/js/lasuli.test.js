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

function initialize()
{
  lasuli.setupLogging();
  var logger = Log4Moz.repository.getLogger("LaSuli.Test");
  logger.level = Log4Moz.Level["Debug"];
  
  var db = new RESTDatabase('http://127.0.0.1/test/');
  
  //Create a new object
  var doc = {};
  doc.name = "Bond";
  db.httpPost(doc);
  logger.info(doc);
  
  var allDocs = db.httpGet("_all_docs?include_docs=true");
  logger.info(allDocs);
  
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
  alert('test');
}

function shutdown()
{
  delete RESTDatabase;
}

window.addEventListener("load", initialize, false);
window.addEventListener("unload", shutdown, false);