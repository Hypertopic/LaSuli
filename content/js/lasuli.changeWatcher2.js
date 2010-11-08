include("resource://lasuli/modules/log4moz.js");
include("resource://lasuli/modules/Services.js");
include("resource://lasuli/modules/Observers.js");
include("resource://lasuli/modules/Sync.js");
include("resource://lasuli/modules/RESTDatabase.js");

lasuli.changeWatcher = {
  fetchers : {},
  threads : {},
  servers : {
            "freecoding": "http://127.0.0.1/argos/_changes?feed=continuous&heartbeat=1000",
            "cassandre": "http://127.0.0.1/cassandre/_changes?feed=continuous&heartbeat=1000"},

  doStart: function(){
    var logger = Log4Moz.repository.getLogger("lasuli.changeWatcher.doStart");
    logger.debug("doStart");
    for(var server in this.servers)
    {
      logger.debug(server);
      var changeUrl = this.servers[server];

      this.threads[server] = Cc["@mozilla.org/thread-manager;1"].getService().newThread(0);
      this.fetchers[server] = new fetcher(server, changeUrl);
      this.threads[server].dispatch(this.fetchers[server], Ci.nsIThread.DISPATCH_NORMAL);
    }
  },

  doShutdown: function(shutdown)
  {
    var logger = Log4Moz.repository.getLogger("lasuli.changeWatcher.doShutdown");
    for(var server in this.servers)
    {
      if(server in this.servers)
      {
        logger.debug("shuting down " + server + "," + shutdown);

        if(shutdown)
        {
          this.threads[server].shutdown();
          delete this.threads[server];
          delete this.fetchers[server];
        }
        else
        {
          this.fetchers[server].working = false;
        }
      }
    }
  },


}
var main = Components.classes["@mozilla.org/thread-manager;1"].getService().mainThread;
var fetcher = function(server, changeUrl) {
  this.server = server;
  this.changeUrl = changeUrl;
  this.working = true;
};
fetcher.prototype = {
  run: function() {
    var thread = Components.classes["@mozilla.org/thread-manager;1"]
                        .getService(Components.interfaces.nsIThreadManager)
                        .currentThread;
    try {
      this.channel = Services.io.newChannel(this.changeUrl, null, null);
      this.aInputStream = this.channel.open();
      this.scriptableInputStream = Cc["@mozilla.org/scriptableinputstream;1"].createInstance(Ci.nsIScriptableInputStream);
      this.scriptableInputStream.init(this.aInputStream);
      main.dispatch(new mainThread(this.server, "open stream"), Ci.nsIThread.DISPATCH_NORMAL);
      while(this.working)
      {
        var byteNum;
        try{ byteNum = this.aInputStream.available(); }catch(e){  break;  }
        main.dispatch(new mainThread(this.server, byteNum), Ci.nsIThread.DISPATCH_NORMAL);
        var str = this.scriptableInputStream.read(byteNum);
        if(str.length == 0){
          main.dispatch(new mainThread(this.server, "closed"), Ci.nsIThread.DISPATCH_NORMAL);
          break;
        }
        if(str.indexOf("}") > 0)
        {
          main.dispatch(new mainThread(this.server, str), Ci.nsIThread.DISPATCH_NORMAL);
          thread.processNextEvent(true);
        }
      }
      main.dispatch(new mainThread(this.server, "exiting thread"), Ci.nsIThread.DISPATCH_NORMAL);
      if(this.scriptableInputStream) this.scriptableInputStream.close();
      if(this.aInputStream) this.aInputStream.close();
    } catch(err) {
      main.dispatch(new mainThread(this.server, err.message), Ci.nsIThread.DISPATCH_NORMAL);
      try{
        if(this.scriptableInputStream) this.scriptableInputStream.close();
        if(this.aInputStream) this.aInputStream.close();
      }catch(e){}
      Components.utils.reportError(err);
    }
    main.dispatch(new mainThread(this.server, "shutdown"), Ci.nsIThread.DISPATCH_NORMAL);
  },

  QueryInterface: function(iid) {
    if (iid.equals(Components.interfaces.nsIRunnable) ||
        iid.equals(Components.interfaces.nsISupports)) {
            return this;
    }
    throw Components.results.NS_ERROR_NO_INTERFACE;
  }
};

var mainThread = function(name, msg) {
  this.name = name;
  this.msg = msg;
};

mainThread.prototype = {
  run: function() {
    var logger = Log4Moz.repository.getLogger("mainThread");
    try {
      logger.debug("[" + this.name + "]" + this.msg);
      //alert(this.msg);
    } catch(err) {
      Components.utils.reportError(err);
    }
    if(this.msg == "shutdown")
      lasuli.changeWatcher.doShutdown(true);
  },

  QueryInterface: function(iid) {
    if (iid.equals(Components.interfaces.nsIRunnable) ||
        iid.equals(Components.interfaces.nsISupports)) {
            return this;
    }
    throw Components.results.NS_ERROR_NO_INTERFACE;
  }
};