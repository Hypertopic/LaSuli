if(typeof(Cc) == "undefined")
  var Cc = Components.classes;
if(typeof(Ci) == "undefined")
  var Ci = Components.interfaces;
if(typeof(Cu) == "undefined")
  var Cu = Components.utils;
if(typeof(include) == "undefined")
  var include = Cu.import;
if(typeof(Exception) == "undefined")
  var Exception = Components.Exception;
  
include("resource://lasuli/modules/StringBundle.js");
include("resource://lasuli/modules/Observers.js");
include("resource://lasuli/modules/Md5.js");

const { require } = Cu.import("resource://gre/modules/commonjs/toolkit/require.js", {})
var preferences =  require('sdk/preferences/service');

/**
 * LaSuli namespace.
 */
var lasuli = {
  _class : "_LASULI_APPEND_CLASS_",
  _htClass : "_LASULI_HIGHTLIGHT_CLASS_",

  jqGirdLoader : function()
  {
    var locale = preferences.get('general.useragent.locale') || 'en-US';
    var i18nUrl = "chrome://lasuli/content/js/i18n/grid.locale-en.js";
    if(locale == "fr-FR")
      i18nUrl = "chrome://lasuli/content/js/i18n/grid.locale-fr.js";
    this._include(i18nUrl);
    this._include("chrome://lasuli/content/js/jquery.jqGrid.min.js");
  },

  _include : function(url){
    var oHead = document.getElementsByTagName('head')[0];
    var oScript = document.createElement('script');
    oScript.type = 'text/javascript';
    oScript.charset = 'utf-8';
    oScript.src = url;
    oHead.appendChild(oScript);
  }
};

//Read localize string
function _(n,arg)
{
  var i18nStrings = new StringBundle("chrome://lasuli/locale/lasuli.properties");
  try{
    return i18nStrings.get(n,arg);
  }catch(e)
  {
    console.error(e, n, arg, i18nStrings.get(n));
  }
}

function getColor(id)
{
  if(id.length > 6)
    return "#" + id.substr(-6);
  else
    return "#" + MD5(id).substr(-6);
}

Array.prototype.unique = function( b ) {
 var a = [], i, l = this.length;
 for( i=0; i<l; i++ ) {
  if( a.indexOf( this[i], 0, b ) < 0 ) { a.push( this[i] ); }
 }
 return a;
};

function getColorOverlay(a,b)
{
  var R1,R2,G1,G2,B1,B2,R,G,B;
  try{
    R1 = parseInt(a.substring(1,3),16);
    G1 = parseInt(a.substring(3,5),16);
    B1 = parseInt(a.substring(5,7),16);
    R2 = parseInt(b.substring(1,3),16);
    G2 = parseInt(b.substring(3,5),16);
    B2 = parseInt(b.substring(5,7),16);
    R=R1+R2-255;
    G=G1+G2-255;
    B=B1+B2-255;
    R = (R>0)?R.toString(16):"00";
    G = (G>0)?G.toString(16):"00";
    B = (B>0)?B.toString(16):"00";
    R = R.length < 2? "0" + R: R;
    G = G.length < 2? "0" + G: G;
    B = B.length < 2? "0" + B: B;
  } catch(e) {
    console.error(e);
  }
  return "#" + R + G + B;
}

function alpha(color, alpha){
  try{
    R = parseInt(color.substring(1,3),16);
    G = parseInt(color.substring(3,5),16);
    B = parseInt(color.substring(5,7),16);
    if(typeof alpha == 'undefined')
      alpha = 0.5;
    return 'rgba(' + R + ',' + G + ',' + B + ',' + alpha + ')';
  } catch(e) {
    console.error(e);
  }
}

function createTreeWalker(doc) {
  return doc.createTreeWalker(
    doc.body,
    NodeFilter.SHOW_TEXT, {
      acceptNode: function(node) {
        return (node.data.length==0
          || node.parentNode && node.parentNode.tagName=="SCRIPT"
        )? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT;
      }
    },
    false
  );
}

function _p(v){ dispatch("lasuli.ui.doUpdateProgressBar", v); }

