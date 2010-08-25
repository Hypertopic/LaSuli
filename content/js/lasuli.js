const Cc = Components.classes;
const Ci = Components.interfaces;
const Cu = Components.utils;

/**
 * LaSuli namespace.
 */
var lasuli = {
  jsBaseDir : "chrome://lasuli/content/js/",
  
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
  }  
};

Cu.import("resource://lasuli/modules/log4moz.js", lasuli);

Array.prototype.remove = function(value)
{
		var j = 0;
		while (j < this.length)
		{
                        if (this[j] == value)
				this.splice(j, 1);
			else
				j++;
		}
}

/*
* Recursively merge properties of two objects 
*/
function MergeRecursive(obj1, obj2) {

  for (var p in obj2) {
    try {
      // Property in destination object set; update its value.
      if ( obj2[p].constructor==Object ) {
        obj1[p] = MergeRecursive(obj1[p], obj2[p]);

      } else {
        obj1[p] = obj2[p];

      }

    } catch(e) {
      // Property in destination object not set; create it and set its value.
      obj1[p] = obj2[p];

    }
  }

  return obj1;
}

//Generate UUID without the "-"
function randomUUID() {
  var s = [], itoh = '0123456789ABCDEF';
  for (var i = 0; i <36; i++) s[i] = Math.floor(Math.random()*0x10);
  s[14] = 4;  // Set 4 high bits of time_high field to version
  s[19] = (s[19] & 0x3) | 0x8;  // Specify 2 high bits of clock sequence
  for (var i = 0; i <36; i++) s[i] = itoh[s[i]];
  s[8] = s[13] = s[18] = s[23] = '';
  return s.join('');
}

// Setup log4moz
function setupLogging() {
  // The basic formatter will output lines like:
  // DATE/TIME	LoggerName	LEVEL	(log message) 
  var formatter = new lasuli.Log4Moz.BasicFormatter();

  // Loggers are hierarchical, lowering this log level will affect all output
  var root = lasuli.Log4Moz.repository.rootLogger;
  if(root.appenders.length > 0) return;
  root.level = lasuli.Log4Moz.Level["All"];
  
  /*var dapp = new lasuli.Log4Moz.DumpAppender(formatter);
  dapp.level = lasuli.Log4Moz.Level["Debug"];
  root.addAppender(dapp);*/
  
  var capp = new lasuli.Log4Moz.ConsoleAppender(formatter);
  capp.level = lasuli.Log4Moz.Level["All"];
  root.addAppender(capp);
  /*
  var logFile = lasuli.getLocalDirectory();
  logFile.append("log.txt");
  var appender = new lasuli.Log4Moz.RotatingFileAppender(logFile, formatter);
  appender.level = lasuli.Log4Moz.Level["Debug"];
  root.addAppender(appender);*/

}