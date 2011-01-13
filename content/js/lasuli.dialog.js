function onOK()
{
  var baseUrl = document.getElementById('txtBaseUrl').value;
	var user    = document.getElementById('txtUser').value;
	var pass    = document.getElementById('txtPass').value;

	var prompts = Cc["@mozilla.org/embedcomp/prompt-service;1"]
                        .getService(Ci.nsIPromptService);

  if (baseUrl == "")
  {
    prompts.alert(window, _('Error'), _('options.dialog.error.urlisnull'));
    return false;
	}
	if (user == '')
	{
    prompts.alert(window, _('Error'), _('options.dialog.error.userisnull'));
    return false;
	}
  if(baseUrl.substr(-1) != '/')
    baseUrl = baseUrl + '/';

  var server  = window.arguments[0];
  server.url = baseUrl;
  server.user = user.toLowerCase();
  server.pass = pass;
	return true;
}

function onLoad()
{
  var server  = window.arguments[0];
  document.getElementById('txtBaseUrl').value = (server && server.url) ? server.url : '';
  document.getElementById('txtUser').value = (server && server.user) ? server.user.toLowerCase() : '';
  document.getElementById('txtPass').value = (server && server.pass) ? server.pass : '';
  var title = (server && server.url) ? _('options.dialog.modify.title') : _('options.dialog.add.title');
  document.getElementById('lasuli-options-dialog').setAttribute('title', title);
  document.getElementById('options.dialog.header').setAttribute('label', _('options.dialog.header'));
  document.getElementById('options.dialog.url').value = _('options.dialog.url');
  document.getElementById('options.dialog.user').value = _('options.dialog.user');
  document.getElementById('options.dialog.pass').value = _('options.dialog.pass');
  document.getElementById('options.dialog.accept').setAttribute('label', _('options.dialog.accept'));
  document.getElementById('options.dialog.cancel').setAttribute('label', _('options.dialog.cancel'));
}