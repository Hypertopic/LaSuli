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

var colorUtil = {

  /**
   * HSV to RGB color conversion
   *
   * H runs from 0 to 360 degrees
   * S and V run from 0 to 100
   * 
   * Ported from the excellent java algorithm by Eugene Vishnevsky at:
   * http://www.cs.rit.edu/~ncs/color/t_convert.html
   */
  hsvToRgb: function(h, s, v) {
  	var r, g, b;
  	var i;
  	var f, p, q, t;
  	
  	// Make sure our arguments stay in-range
  	h = Math.max(0, Math.min(360, h));
  	s = Math.max(0, Math.min(100, s));
  	v = Math.max(0, Math.min(100, v));
  	
  	// We accept saturation and value arguments from 0 to 100 because that's
  	// how Photoshop represents those values. Internally, however, the
  	// saturation and value are calculated from a range of 0 to 1. We make
  	// That conversion here.
  	s /= 100;
  	v /= 100;
  	
  	if(s == 0) {
  		// Achromatic (grey)
  		r = g = b = v;
  		return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];
  	}
  	
  	h /= 60; // sector 0 to 5
  	i = Math.floor(h);
  	f = h - i; // factorial part of h
  	p = v * (1 - s);
  	q = v * (1 - s * f);
  	t = v * (1 - s * (1 - f));

	  switch(i) {
		case 0:
			r = v;
			g = t;
			b = p;
			break;
			
		case 1:
			r = q;
			g = v;
			b = p;
			break;
			
		case 2:
			r = p;
			g = v;
			b = t;
			break;
			
		case 3:
			r = p;
			g = q;
			b = v;
			break;
			
		case 4:
			r = t;
			g = p;
			b = v;
			break;
			
		default: // case 5:
			r = v;
			g = p;
			b = q;
	  }
	
	  return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];
  },
  
  colorCalc: function(a,b)
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
    }catch(e){}
    return "#" + R + G + B;
  },

  index2rgb: function(topicIndex)
  {
    var rgb = this.hsvToRgb( 0.3* topicIndex % 1 * 360, 50, 70);
    var R,G,B;
    try{
      R = rgb[0];
      G = rgb[1];
      B = rgb[2];
      R = (R>0)?R.toString(16):"00";
      G = (G>0)?G.toString(16):"00";
      B = (B>0)?B.toString(16):"00";
      return "#" + R + G + B;
    }catch(e){}
  }
}