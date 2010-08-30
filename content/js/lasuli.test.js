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

function initialize()
{
  lasuli.setupLogging();
  var logger = Log4Moz.repository.getLogger("LaSuli.Test");
  logger.level = Log4Moz.Level["All"];
  RESTDatabase.init('http://127.0.0.1/test/');

}


function shutdown()
{
  //delete RESTDatabase;
}

window.addEventListener("load", initialize, false);
window.addEventListener("unload", shutdown, false);