var EXPORTED_SYMBOLS = ["XMLHttpRequest"];
const Cc = Components.classes;
const Ci = Components.interfaces;
const Cu = Components.utils;

function XMLHttpRequest()
{
  var self = this;

  self.wrapped = Cc["@mozilla.org/xmlextras/xmlhttprequest;1"].createInstance(Ci.nsIXMLHttpRequest);
    
  self.setRequestHeader = function(header, value) 
  {
    self.wrapped.setRequestHeader(header, value);
  };
  
  self.open = function(method, url, sync)
  {
    self.method = method;
    self.url = url;
    self.sync = sync;
    self.wrapped.open(method, url, sync);
  };
  
  self.send = function(data)
  {
    self.data = data;
    
    if ( self.multipart )
      self.wrapped.multipart = self.multipart;
    
    self.wrapped.onreadystatechange = function()
    {
      updateData();
      if ( self.onreadystatechange )
        self.onreadystatechange();
    };
    
    self.wrapped.onload = function()
    {
      updateData();
      if ( self.onload )
        self.onload();
    };
    
    self.wrapped.onerror = function()
    {
      updateData();
      if ( self.onerror )
        self.onerror();
    };
    
    self.wrapped.send(data);
  };
   
  self.abort = function() 
  {
    self.wrapped.abort();
  };
    
  self.getAllResponseHeaders = function() 
  {
    return(self.wrapped.getAllResponseHeaders());
  };
    
  self.getResponseHeader = function(header) 
  {
    return(self.wrapped.getResponseHeader(header));
  };
  
  self.overrideMimeType = function(mimetype) 
  {
    self.wrapped.overrideMimeType(mimetype);
  }
 
  function updateData() 
  {
    if ( self.wrapped.readyState )
        self.readyState = self.wrapped.readyState;

    if ( self.wrapped.status )
        self.status = self.wrapped.status;
            
    if ( self.wrapped.statusText )
        self.statusText = self.wrapped.statusText;

    if ( self.wrapped.responseText )
        self.responseText = self.wrapped.responseText;
            
    if ( self.wrapped.responseHeaders )
        self.responseHeaders = self.wrapped.responseHeaders;
    
    if ( self.wrapped.responseXML )
      self.responseXML = self.wrapped.responseXML;
  }
}