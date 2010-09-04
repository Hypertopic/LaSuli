if(typeof(Cc) == "undefined")
  var Cc = Components.classes;
if(typeof(Ci) == "undefined")
  var Ci = Components.interfaces;
if(typeof(Cu) == "undefined")
  var Cu = Components.utils;
if(typeof(include) == "undefined")
  var include = Cu.import;
if(typeof(Exception) == "undefined")
  var Exception = Components.Exception;

include("resource://lasuli/modules/log4moz.js");
include("resource://lasuli/modules/StringBundle.js");
include("resource://lasuli/modules/Services.js");
include("resource://lasuli/modules/Preferences.js");

/**
 * LaSuli namespace.
 */
var lasuli = {
  _class : "_LASULI_APPEND_CLASS_",
  _htClass : "_LASULI_HIGHTLIGHT_CLASS_",
  
  getLocalDirectory : function() {
    var directoryService =
      Cc["@mozilla.org/file/directory_service;1"].
        getService(Ci.nsIProperties);
    // this is a reference to the profile dir (ProfD) now.
    var localDir = directoryService.get("ProfD", Ci.nsIFile);
  
    localDir.append("lasuli");
  
    if (!localDir.exists() || !localDir.isDirectory()) {
      // read and write permissions to owner and group, read-only for others.
      localDir.create(Ci.nsIFile.DIRECTORY_TYPE, 0774);
    }
  
    return localDir;
  },
  
  // Setup log4moz
  setupLogging: function() {
    // The basic formatter will output lines like:
    // DATE/TIME	LoggerName	LEVEL	(log message) 
    var formatter = new Log4Moz.BasicFormatter();
  
    // Loggers are hierarchical, lowering this log level will affect all output
    var root = Log4Moz.repository.rootLogger;
    if(root.appenders.length > 0) return;
    root.level = Log4Moz.Level["All"];
    
    /*var dapp = new lasuli.Log4Moz.DumpAppender(formatter);
    dapp.level = lasuli.Log4Moz.Level["Debug"];
    root.addAppender(dapp);*/
    
    var capp = new Log4Moz.ConsoleAppender(formatter);
    capp.level = Log4Moz.Level["All"];
    root.addAppender(capp);
    /*
    var logFile = lasuli.getLocalDirectory();
    logFile.append("log.txt");
    var appender = new lasuli.Log4Moz.RotatingFileAppender(logFile, formatter);
    appender.level = lasuli.Log4Moz.Level["Debug"];
    root.addAppender(appender);*/
  },
  
  jqGirdLoader : function()
  {
    var locale = Preferences.get("general.useragent.locale", "en-US");
    var i18nUrl = "chrome://lasuli/content/js/i18n/grid.locale-en.js";
    if(locale == "fr-FR")
      i18nUrl = "chrome://lasuli/content/js/i18n/grid.locale-fr.js";
    this._include(i18nUrl);
    this._include("chrome://lasuli/content/js/jquery.jqGrid.min.js");
  },
  
  _include : function(url){
    var oHead = document.getElementsByTagName('head')[0];
    var oScript = document.createElement('script');
    oScript.type = 'text/javascript';
    oScript.charset = 'utf-8';
    oScript.src = url;
    oHead.appendChild(oScript);
  }
};

//Read localize string
function _(n,arg)
{
  var logger = Log4Moz.repository.getLogger("i18n");
  var i18nStrings = new StringBundle("chrome://lasuli/locale/lasuli.properties");
  try{
    //logger.debug("get string:" + n + ", return:" + i18nStrings.get(n,arg));
    return i18nStrings.get(n,arg);
  }catch(e)
  {
    logger.error(n);
    return n;
  }
}