include("resource://lasuli/modules/log4moz.js");
include("resource://lasuli/modules/Services.js");
include("resource://lasuli/modules/Sync.js");

var changeWatcherThread = function(baseUrl, lastSeq) {
  this.baseUrl = baseUrl;
  this.lastSeq = lastSeq;
  this.channel = null;
  this.aInputStream = null;
  this.scriptableInputStream = null;
};

changeWatcherThread.prototype = {
  run: function() {
    var logger = Log4Moz.repository.getLogger("changeWatcherThread.run");
    try {
      var now = (new Date()).getTime();
      var changeUrl = this.baseUrl + "_changes?feed=continuous&heartbeat=1000&since=" + this.lastSeq + "&_t=" + now;
      logger.debug(changeUrl);
      this.channel = Services.io.newChannel(changeUrl, null, null);
      try{
        logger.debug('opening channel');
        this.aInputStream = this.channel.open();
        logger.debug('typeof' + typeof(this.aInputStream));
      }catch(e){
        logger.fatal('NS_ERROR_IN_PROGRESS');
      }
      this.scriptableInputStream = Cc["@mozilla.org/scriptableinputstream;1"].createInstance(Ci.nsIScriptableInputStream);
      this.scriptableInputStream.init(this.aInputStream);
      while(1)
      {
        var str = this.scriptableInputStream.read(this.aInputStream.available());
        if(str.length == 0)
          break;
        logger.debug(str);
        //Change happens
        if(str.indexOf("}") > 0)
        {
          try
          {
            var lines = str.trim().split('\n');
            //logger.debug(lines);
            if(lines.length == 0) continue;
            logger.debug(lines[lines.length - 1]);
            var result = JSON.parse(lines[lines.length - 1]);
            if(result.seq > this.lastSeq)
            {
              logger.debug(result.seq);
              this.lastSeq = result.seq;
              main.dispatch(new changeWatcher(this.baseUrl, this.lastSeq), Ci.nsIThread.DISPATCH_NORMAL);
            }
          }catch(err)
          {
            logger.fatal('error when parsing:' + str);
            logger.fatal(err);
          }
        }
      }
    } catch(err) {
      logger.fatal('exit run');
      logger.fatal(err);
      try{
        if(this.scriptableInputStream) this.scriptableInputStream.close();
        if(this.aInputStream) this.aInputStream.close();
      }catch(e){
        logger.fatal('fail to close stream');
        logger.fatal(e);
      }
    }
  },

  QueryInterface: function(iid) {
    if (iid.equals(Components.interfaces.nsIRunnable) ||
        iid.equals(Components.interfaces.nsISupports)) {
            return this;
    }
    throw Components.results.NS_ERROR_NO_INTERFACE;
  }
};

var changeWatcher = function(baseUrl, lastSeq) {
  this.baseUrl = baseUrl;
  this.lastSeq = lastSeq;
};

changeWatcher.prototype = {
  run: function() {
    try {
      // This is where we react to the completion of the working thread.
      alert('baseUrl ' + this.baseUrl + ' finished with lastSeq: ' + this.lastSeq);
    } catch(err) {
      Components.utils.reportError(err);
    }
  },

  QueryInterface: function(iid) {
    if (iid.equals(Components.interfaces.nsIRunnable) ||
        iid.equals(Components.interfaces.nsISupports)) {
            return this;
    }
    throw Components.results.NS_ERROR_NO_INTERFACE;
  }
};

var main = Components.classes["@mozilla.org/thread-manager;1"].getService().mainThread;
var background;
var lastSeq = 1;
function init(){
  background = Components.classes["@mozilla.org/thread-manager;1"].getService().newThread(0);
  background.dispatch(new changeWatcherThread('http://127.0.0.1/argos/', lastSeq), Components.interfaces.nsIThread.DISPATCH_NORMAL);
}

function stopme(){
  background.shutdown();
  lastSeq++;
}