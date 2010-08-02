function log(level, args)
{
	if (window.console)
	{
		var logger = window.console[level];
		if (typeof logger == 'function')
			logger.apply(window.console, args);
	}
}

function info(args)
{
	log('info', arguments);
}

function warn(args)
{
	log('warn', arguments);
}

function debug(args)
{
	log('debug', arguments);
}

jQuery.fn.log = function (msg) {
	try{
  	if(typeof(msg) == 'object')
  		try{ msg = JSON.stringify(msg); }catch(e){}
  	console.log("%s: %o", msg, this);
  }catch(e){}
    return this;
};