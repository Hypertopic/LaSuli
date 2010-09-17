const Cc = Components.classes;
const Ci = Components.interfaces;
const Cu = Components.utils;

Cu.import("resource://lasuli/modules/Preferences.js");

function onOK()
{
  var baseUrl = document.getElementById('txtBaseUrl').value;
	var user    = document.getElementById('txtUser').value;
	var pass    = document.getElementById('txtPass').value;

	var prompts = Cc["@mozilla.org/embedcomp/prompt-service;1"]
                        .getService(Ci.nsIPromptService);

  if (baseUrl == "")
  {
    prompts.alert(window, "Erreur", "Vérifiez l'URL du service Hypertopic!");
    return false;
	}
	if (user == '')
	{
    prompts.alert(window, "Erreur", "Veuillez saisir le nom d'utilisateur!");
    return false;
	}
  if(baseUrl.substr(-1) != '/')
    baseUrl = baseUrl + '/';
	Preferences.set("extensions.lasuli.baseUrl",baseUrl);
	Preferences.set("extensions.lasuli.user",user);
	Preferences.set("extensions.lasuli.pass",pass);
	return true;
}

function onLoad()
{
  document.getElementById('txtBaseUrl').value = Preferences.get("extensions.lasuli.baseUrl", "http://hypertopic.couchone.com/argos/");
  document.getElementById('txtUser').value = Preferences.get("extensions.lasuli.user", "user@hypertopic.org");
  document.getElementById('txtPass').value = Preferences.get("extensions.lasuli.pass", "");
}