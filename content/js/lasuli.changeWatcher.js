include("resource://lasuli/modules/log4moz.js");
include("resource://lasuli/modules/Services.js");
include("resource://lasuli/modules/Observers.js");
include("resource://lasuli/modules/Sync.js");

var mainThread = Components.classes["@mozilla.org/thread-manager;1"].getService().mainThread;

lasuli.changeWatcher = {
  fetchers : {},
  threads : {},
  servers : {},

  doRestart: function(){
  },
  doStart: function(){
    var logger = Log4Moz.repository.getLogger("lasuli.changeWatcher.doStart");
    logger.debug("doStart");
    for(var server in HtServers)
    {
      if(server in this.threads) continue;
      var lastSeq = HtServers[server].getLastSeq();
      logger.debug(server);
      logger.debug(lastSeq);
      this.threads[server] = Cc["@mozilla.org/thread-manager;1"].getService().newThread(0);
      this.fetchers[server] = new fetcher(server, HtServers[server].baseUrl, lastSeq);
      this.threads[server].dispatch(this.fetchers[server], Ci.nsIThread.DISPATCH_NORMAL);
    }
  },

  doShutdown: function()
  {
    var logger = Log4Moz.repository.getLogger("lasuli.changeWatcher.doShutdown");
    for(var server in this.fetchers)
    {
      logger.debug("closing server:" + server);
      this.fetchers[server].working = false;
    }
  },

  doKillThread: function()
  {
    var logger = Log4Moz.repository.getLogger("lasuli.changeWatcher.doKillThread");
    for(var server in this.fetchers)
    {
      logger.debug("killing thread:" + server);
      this.threads[server].shutdown();
      delete this.threads[server];
      delete this.fetchers[server];
    }
  }
}

var fetcher = function(server, serverUrl, lastSeq) {
  this.server = server;
  this.serverUrl = serverUrl;
  this.lastSeq = lastSeq;
  this.heartBeat = 2*1000;
  this.working = true;
};
fetcher.prototype = {
  run: function() {
    var thread = Components.classes["@mozilla.org/thread-manager;1"]
                        .getService(Components.interfaces.nsIThreadManager)
                        .currentThread;
    var changeUrl = this.serverUrl + "_changes?feed=continuous&heartbeat=" + this.heartBeat;
    if(this.lastSeq) changeUrl += "&since=" + this.lastSeq;
    try {
      this.channel = Services.io.newChannel(changeUrl, null, null);
      this.aInputStream = this.channel.open();
      this.scriptableInputStream = Cc["@mozilla.org/scriptableinputstream;1"].createInstance(Ci.nsIScriptableInputStream);
      this.scriptableInputStream.init(this.aInputStream);
      mainThread.dispatch(new messageThread(this.server, "debug", "open stream"), Ci.nsIThread.DISPATCH_NORMAL);
      while(this.working)
      {
        var byteNum,str = "";
        try{
          byteNum = this.aInputStream.available();
          mainThread.dispatch(new messageThread(this.server, "debug", byteNum), Ci.nsIThread.DISPATCH_NORMAL);
          str = this.scriptableInputStream.read(byteNum);
        }catch(e){  break;  }
        if(str.length == 0){
          mainThread.dispatch(new messageThread(this.server, "notify", "closed"), Ci.nsIThread.DISPATCH_NORMAL);
          break;
        }
        if(str.indexOf("}") > 0)
        {
          mainThread.dispatch(new messageThread(this.server, "notify", "changed"), Ci.nsIThread.DISPATCH_NORMAL);
          thread.processNextEvent(true);
        }
      }
      mainThread.dispatch(new messageThread(this.server, "debug", "exiting thread"), Ci.nsIThread.DISPATCH_NORMAL);
      if(this.scriptableInputStream) this.scriptableInputStream.close();
      if(this.aInputStream) this.aInputStream.close();
    } catch(err) {
      mainThread.dispatch(new messageThread(this.server, "debug", err.message), Ci.nsIThread.DISPATCH_NORMAL);
      try{
        if(this.scriptableInputStream) this.scriptableInputStream.close();
        if(this.aInputStream) this.aInputStream.close();
      }catch(e){}
      Components.utils.reportError(err);
    }
    mainThread.dispatch(new messageThread(this.server, "action", "killThread"), Ci.nsIThread.DISPATCH_NORMAL);
  },

  QueryInterface: function(iid) {
    if (iid.equals(Components.interfaces.nsIRunnable) ||
        iid.equals(Components.interfaces.nsISupports)) {
            return this;
    }
    throw Components.results.NS_ERROR_NO_INTERFACE;
  }
};

var messageThread = function(msgSource, msgType, msgContent) {
  this.msgSource = msgSource;
  this.msgType = msgType;
  this.msgContent = msgContent;
};

messageThread.prototype = {
  run: function() {
    var logger = Log4Moz.repository.getLogger("messageThread");
    try {
      logger.debug("[" + this.msgSource + "] " + this.msgType + ":" + this.msgContent);
      //alert(this.msg);
    } catch(err) {
      Components.utils.reportError(err);
    }
    if(this.msgContent == "killThread")
      lasuli.changeWatcher.doKillThread();
    //if(this.msgType == "notify" && this.msgContent == "changed")
    //  HtServers[this.msgSource].purgeCache();
  },

  QueryInterface: function(iid) {
    if (iid.equals(Components.interfaces.nsIRunnable) ||
        iid.equals(Components.interfaces.nsISupports)) {
            return this;
    }
    throw Components.results.NS_ERROR_NO_INTERFACE;
  }
};