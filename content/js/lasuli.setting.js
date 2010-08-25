/**
 * LaSuli namespace.
 */
if ("undefined" == typeof(lasuli)) 
  var lasuli = {};

const Cc = Components.classes;
const Ci = Components.interfaces;

lasuli.setting = 
{
  prefs : null,
  txtService : null,
  txtUser : null,
  txtPass : null,
  
  //Try to load the setting from preferences
  loadSetting : function()
  {
    window.sizeToContent();
    this.txtService = document.getElementById('txtService');
    this.txtUser = document.getElementById('txtUser');
    this.txtPass = document.getElementById('txtPass');
    this.prefs = Cc["@mozilla.org/preferences-service;1"]
                    .getService(Ci.nsIPrefService).getBranch("lasuli.setting.");
    var setting = {};
    try{
      var strSetting = this.prefs.getComplexValue("service", Ci.nsIPrefLocalizedString).data;
      setting = (strSetting) ? JSON.parse(strSetting) : {};
    }catch(e){}
    this.txtService.value = (setting.service) ? setting.service : 'http://hypertopic.couchone.com';
    this.txtUser.value = (setting.user) ? setting.user : 'user@hypertopic.org';
    this.txtPass.value = (setting.pass) ? setting.pass : 'default';
  },
  
  //Save the setting
  saveSetting : function()
  {
    if(this.txtService.value == "")
    {
      alert("Vérifiez l'URL du service Hypertopic!");
      return false;
    }
    if(this.txtUser.value == "")
    {
      alert("Veuillez saisir le nom de l'utilisateur!");
      return false;
    }
    
    var setting = {};
    setting.service = this.txtService.value;
    setting.user = this.txtUser.value;
    setting.pass = this.txtPass.value;
    setting = JSON.stringify(setting);
    var pls = Cc["@mozilla.org/pref-localizedstring;1"]
                    .createInstance(Ci.nsIPrefLocalizedString);
    pls.data = setting;
    return this.prefs.setComplexValue("service", 
                      Ci.nsIPrefLocalizedString, pls);
  },
  
  destory: function()
  {
	}
}