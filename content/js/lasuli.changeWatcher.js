include("resource://lasuli/modules/log4moz.js");
include("resource://lasuli/modules/Services.js");
include("resource://lasuli/modules/Observers.js");
include("resource://lasuli/modules/Sync.js");
include("resource://lasuli/modules/RESTDatabase.js");

var changeWatcherThread = function(baseUrl, lastSeq) {
  this.baseUrl = baseUrl;
  this.lastSeq = lastSeq;
  this.channel = null;
  this.aInputStream = null;
  this.scriptableInputStream = null;
  this.mainThread = Components.classes["@mozilla.org/thread-manager;1"].getService().mainThread;
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
        if(str.length == 0){
          this.mainThread.dispatch(new changeWatcher(this.baseUrl, -1), Ci.nsIThread.DISPATCH_NORMAL);
          break;
        }
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
              this.mainThread.dispatch(new changeWatcher(this.baseUrl, this.lastSeq), Ci.nsIThread.DISPATCH_NORMAL);
            }
          }catch(err)
          {
            logger.fatal('error when parsing:' + str);
            logger.fatal(err);
          }
        }
      }
      if(this.scriptableInputStream) this.scriptableInputStream.close();
      if(this.aInputStream) this.aInputStream.close();
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
    var logger = Log4Moz.repository.getLogger("changeWatcher.run");
    try {
      /*if(this.lastSeq)
        if(this.lastSeq == -1)
          dispatch("lasuli.changeWatcher.doSpawn", this.baseUrl);
        else{
          RESTDatabase.lastSeq = this.lastSeq;
          RESTDatabase.purge();
        }*/
      logger.debug(this.lastSeq);
    } catch(err) {
      logger.fatal(err);
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


lasuli.changeWatcher = {
  fetcher : null,

  doStart: function(){
    if(!this.fetcher){
      this.fetcher = Cc["@mozilla.org/thread-manager;1"].getService().newThread(0);
      this.fetcher.dispatch(new changeWatcherThread(RESTDatabase.baseUrl, RESTDatabase.lastSeq), Ci.nsIThread.DISPATCH_NORMAL);
    }
  },

  doShutdown: function(){
    if(this.fetcher)
      this.fetcher.shutdown();
    this.fetcher = null;
  },

  doSpawn : function(baseUrl){
    var logger = Log4Moz.repository.getLogger("lasuli.changeWatcher.doSpawn");
    logger.debug(baseUrl);
    this.fetcher = null;
    //Clear the cache to make sure data is clean
    RESTDatabase.purge();
    //Sleep 3 second and retry
    Sync.sleep(3000);
    this.doStart();
  },

  register: function(){
    for(var func in this)
      if(func.substr(0, 2) == "do")
        Observers.add("lasuli.changeWatcher." + func, lasuli.changeWatcher[func], lasuli.changeWatcher);
  },

  unregister: function(){
    for(var func in this)
      if(func.substr(0, 2) == "do")
        Observers.remove("lasuli.changeWatcher." + func, lasuli.changeWatcher[func], lasuli.changeWatcher);
  }
}

window.addEventListener("load", function() {
  lasuli.changeWatcher.register();
}, false);

window.addEventListener("unload", function() {
  lasuli.changeWatcher.unregister();
}, false)