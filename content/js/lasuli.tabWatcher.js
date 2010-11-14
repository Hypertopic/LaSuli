const NOTIFY_STATE_DOCUMENT = Components.interfaces.nsIWebProgress.NOTIFY_STATE_DOCUMENT;
const STATE_IS_DOCUMENT = Components.interfaces.nsIWebProgressListener.STATE_IS_DOCUMENT;
const STATE_START = Components.interfaces.nsIWebProgressListener.STATE_START;
const STATE_STOP = Components.interfaces.nsIWebProgressListener.STATE_STOP;
const NOTIFY_LOCATION = Components.interfaces.nsIWebProgress.NOTIFY_LOCATION;
const NOTIFY_STATE_ALL = Components.interfaces.nsIWebProgress.NOTIFY_STATE_ALL;

//implement nsIWebProgressListener (https://developer.mozilla.org/en/nsIWebProgressListener)
lasuli.tabWatcher =
{
  QueryInterface: function(aIID){
    if (aIID.equals(Components.interfaces.nsIWebProgressListener) ||
      aIID.equals(Components.interfaces.nsISupportsWeakReference) ||
      aIID.equals(Components.interfaces.nsISupports))
      return this;
    throw Components.results.NS_NOINTERFACE;
  },

  onStateChange: function(aWebProgress, aRequest, aFlag, aStatus){
    var logger = Log4Moz.repository.getLogger("lasuli.tabWatcher.onStateChange");
    // If you use myListener for more than one tab/window, use
    // aWebProgress.DOMWindow to obtain the tab/window which triggers the state change
    var doc = aWebProgress.DOMWindow.document;
    var docHref = doc.location.href;
    if(aFlag & STATE_START)
    {
      logger.trace("The load event is initiated");
    }
    if(aFlag & STATE_STOP)
    {
      logger.trace(docHref + " is loaded!");
      Observers.notify("lasuli.core.doStateChange", aWebProgress.DOMWindow);
    }
    return 0;
  },

  onLocationChange: function(aProgress, aRequest, aURI){
    var logger = Log4Moz.repository.getLogger("lasuli.tabWatcher.onLocationChange");
    var strURI = "";
    if(aURI!= null && typeof(aURI.spec) == "string")
      strURI = aURI.spec;
    //logger.trace(strURI);
    if(strURI.indexOf("#") > 0)
      strURI = strURI.substring(0, strURI.indexOf('#'));
    logger.trace(strURI);

    Observers.notify("lasuli.core.doLocationChange", strURI);
    return 0;
  },

  onProgressChange: function() {return 0;},
  onStatusChange: function() {return 0;},
  onSecurityChange: function() {return 0;},
  onLinkIconAvailable: function() {return 0;}
}

window.addEventListener("load", function(){
  gBrowser.addProgressListener(lasuli.tabWatcher, NOTIFY_STATE_DOCUMENT);
}, false);

window.addEventListener("unload", function(){
  gBrowser.removeProgressListener(lasuli.tabWatcher);
}, false);