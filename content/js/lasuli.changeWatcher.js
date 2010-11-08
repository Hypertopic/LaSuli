include("resource://lasuli/modules/log4moz.js");
include("resource://lasuli/modules/Services.js");
include("resource://lasuli/modules/Observers.js");
include("resource://lasuli/modules/Sync.js");
include("resource://lasuli/modules/RESTDatabase.js");

var changeWatcherThread = function(baseUrl, lastSeq) {
  this.baseUrl = baseUrl;
  this.lastSeq = (typeof(lastSeq) == 'number') ? lastSeq : 1;
  this.channel = null;
  this.aInputStream = null;
  this.scriptableInputStream = null;
  this.mainThread = Components.classes["@mozilla.org/thread-manager;1"].getService().mainThread;
};

changeWatcherThread.prototype = {

  run: function() {
    var logger = Log4Moz.repository.getLogger("changeWatcherThread.run");
    try {
      let thread = Cc["@mozilla.org/thread-manager;1"].getService().currentThread;
      var now = (new Date()).getTime();
      logger.debug("start:" + now);
      for(var i=0; i < now; i++){
        if(i % 10000000 == 0){
          i=0;
          logger.debug("running:" + (new Date()).getTime());
          this.mainThread.dispatch(new changeWatcher(this.baseUrl, now), Ci.nsIThread.DISPATCH_NORMAL);
          thread.processNextEvent(true);
        }
      }

      /*var changeUrl = this.baseUrl + "_changes?feed=continuous&heartbeat=1000&since=" + this.lastSeq + "&_t=" + now;
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
      if(this.aInputStream) this.aInputStream.close();*/
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
      dispatch("lasuli.changeWatcher.doSpawn", this.baseUrl);
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
    var logger = Log4Moz.repository.getLogger("lasuli.changeWatcher.doStart");
    logger.debug((!this.fetcher || this.fetcher == null));
    logger.debug(typeof(this.fetcher));
    if(!this.fetcher || this.fetcher == null){
      logger.debug('start');
      this.fetcher = Cc["@mozilla.org/thread-manager;1"].getService().newThread(0);
      this.fetcher.dispatch(new changeWatcherThread(RESTDatabase.baseUrl, RESTDatabase.lastSeq), Ci.nsIThread.DISPATCH_NORMAL);
    }
  },

  doShutdown: function(){
    if(this.fetcher && this.fetcher != null)
      try{ this.fetcher.shutdown(); }catch(e){ }
    this.fetcher = null;
  },

  doSpawn : function(baseUrl){
    var logger = Log4Moz.repository.getLogger("lasuli.changeWatcher.doSpawn");
    logger.debug(baseUrl);
    this.doShutdown();
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
  },

  chromeCreated : function(domWindow, url){
    var logger = Log4Moz.repository.getLogger("lasuli.changeWatcher.chromeCreated");
    if(domWindow.name && domWindow.name == 'sidebar'){
      if(lasuli.core.lasuliOpened)
      {
        logger.debug(domWindow.name + " thread started");
        this.doShutdown();
        this.doStart();
      }
      else
      {
        logger.debug(domWindow.name + " thread stoped");
        this.doShutdown();
      }
    }
  }
}
/*
window.addEventListener("load", function() {
  lasuli.changeWatcher.register();
  Observers.add("chrome-document-global-created", lasuli.changeWatcher.chromeCreated, lasuli.changeWatcher);
}, false);

window.addEventListener("unload", function() {
  lasuli.changeWatcher.doShutdown();
  lasuli.changeWatcher.unregister();
  Observers.remove("chrome-document-global-created", lasuli.changeWatcher.chromeCreated, lasuli.changeWatcher);
}, false)*/