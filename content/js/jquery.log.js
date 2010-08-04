function error(aMessage, aSourceName, args)
{
	myLogToConsole(aMessage, aSourceName, null, null, null, 0x0, null, args);
}

function warn(aMessage, aSourceName, args)
{
	myLogToConsole(aMessage, aSourceName, null, null, null, 0x1, null, args);
}

function exception(aMessage, aSourceName, args)
{
	myLogToConsole(aMessage, aSourceName, null, null, null, 0x2, null, args);
}

function strict(aMessage, aSourceName, args)
{
	myLogToConsole(aMessage, aSourceName, null, null, null, 0x4, null, args);
}

function myLogToConsole(aMessage, aSourceName, aSourceLine, aLineNumber,
                        aColumnNumber, aFlags, aCategory, args)
{
	aSourceName = (aSourceName) ? jsBaseDir + aSourceName : null;
	aMessage = (typeof(aMessage) == "string") ? aMessage : JSON.stringify(aMessage);
	if(args)
	{
		var funcName;
		if(typeof(args) == "string")
			funcName = args
		else
			funcName = args.callee.toString().substr(0, funcName.indexOf(')') + 1);
   	aMessage = funcName + "\n" + aMessage;
	}
  var consoleService = Components.classes["@mozilla.org/consoleservice;1"]
                                 .getService(Components.interfaces.nsIConsoleService);
  var scriptError = Components.classes["@mozilla.org/scripterror;1"]
                              .createInstance(Components.interfaces.nsIScriptError);
  scriptError.init(aMessage, aSourceName, aSourceLine, aLineNumber,
                   aColumnNumber, aFlags, aCategory);
  consoleService.logMessage(scriptError);
}

function log(aMessage, args)
{
  var consoleService = Components.classes["@mozilla.org/consoleservice;1"]
                                 .getService(Components.interfaces.nsIConsoleService);
  aMessage = (typeof(aMessage) == "string") ? aMessage : JSON.stringify(aMessage);
  if(args)
	{
		var funcName;
		if(typeof(args) == "string")
			funcName = args
		else
			funcName = args.callee.toString().substr(0, funcName.indexOf(')') + 1);
   	aMessage = funcName + "\n" + aMessage;
	}
  consoleService.logStringMessage(aMessage);
}