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
include("resource://lasuli/modules/Preferences.js");
include("resource://lasuli/modules/Observers.js");
include("resource://lasuli/modules/Md5.js");

/**
 * LaSuli namespace.
 */
var lasuli = {
  _class : "_LASULI_APPEND_CLASS_",
  _htClass : "_LASULI_HIGHTLIGHT_CLASS_",

  init: function(){
    lasuli.setupLogging();
  },

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
    var debugLevel = Preferences.get("extensions.lasuli.log.level",'Warn');
    var logfile = Preferences.get("extensions.lasuli.log.file", "");

    // The basic formatter will output lines like:
    // DATE/TIME	LoggerName	LEVEL	(log message)
    var formatter = new Log4Moz.BasicFormatter();

    // Loggers are hierarchical, lowering this log level will affect all output
    var root = Log4Moz.repository.rootLogger;
    if(root.appenders.length > 0) return;
    root.level = Log4Moz.Level[debugLevel];

    var capp = new Log4Moz.ConsoleAppender(formatter);
    capp.level = Log4Moz.Level[debugLevel];
    root.addAppender(capp);

    if(logfile != "")
    {
      var logFile = lasuli.getLocalDirectory();
      logFile.append("log.txt");
      var appender = new Log4Moz.RotatingFileAppender(logFile, formatter);
      appender.level = Log4Moz.Level[debugLevel];
      root.addAppender(appender);
    }
    var logger = Log4Moz.repository.getLogger("setupLogging");
    logger.trace(lasuli.getLocalDirectory());
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
    return i18nStrings.get(n,arg);
  }catch(e)
  {
    logger.fatal(n);
    logger.fatal(JSON.stringify(arg));
    logger.fatal(i18nStrings.get(n));
    logger.fatal(e.message);
  }
}

function getColor(id)
{
  if(id.length > 6)
    return "#" + id.substr(-6);
  else
    return "#" + MD5(id).substr(-6);
}

Array.prototype.unique = function( b ) {
 var a = [], i, l = this.length;
 for( i=0; i<l; i++ ) {
  if( a.indexOf( this[i], 0, b ) < 0 ) { a.push( this[i] ); }
 }
 return a;
};

function getColorOverlay(a,b)
{
  var R1,R2,G1,G2,B1,B2,R,G,B;
  try{
    R1 = parseInt(a.substring(1,3),16);
    G1 = parseInt(a.substring(3,5),16);
    B1 = parseInt(a.substring(5,7),16);
    R2 = parseInt(b.substring(1,3),16);
    G2 = parseInt(b.substring(3,5),16);
    B2 = parseInt(b.substring(5,7),16);
    R=R1+R2-255;
    G=G1+G2-255;
    B=B1+B2-255;
    R = (R>0)?R.toString(16):"00";
    G = (G>0)?G.toString(16):"00";
    B = (B>0)?B.toString(16):"00";
    R = R.length < 2? "0" + R: R;
    G = G.length < 2? "0" + G: G;
    B = B.length < 2? "0" + B: B;
  }catch(e){ logger.fatal(e); }
  return "#" + R + G + B;
}

function alpha(color, alpha){
  try{
    R = parseInt(color.substring(1,3),16);
    G = parseInt(color.substring(3,5),16);
    B = parseInt(color.substring(5,7),16);
    if(typeof alpha == 'undefined')
      alpha = 0.5;
    return 'rgba(' + R + ',' + G + ',' + B + ',' + alpha + ')';
  }catch(e){ logger.fatal(e); }
}

function _p(v){ dispatch("lasuli.ui.doUpdateProgressBar", v); }

