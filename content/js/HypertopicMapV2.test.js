function w(str)
{
  str = (typeof(str) == "string") ? str : JSON.stringify(str);
  $('#result').html($('#result').html() + "<p>" + str + "</p>");
}

function HypertopicV2Test()
{
  this._sourceName = "HypertopicMapV2.test.js";
  
  var user = 'chao@zhou.fr';
  var corpus_name = 'Testing';
  var map = new HypertopicMapV2('http://127.0.0.1/argos_dev/_design/argos/_rewrite/');
  var result;
  /**** Corpus or Viewpoint
  result = map.register('5a03d6d794ec4b9215f7cba8600c24db', 'chao@zhou.fr');
  w(result);
  result = map.unregister('5a03d6d794ec4b9215f7cba8600c24db', 'chao@zhou.fr');
  w(result);
  
  
  result = map.createCorpus(corpus_name,user);
  if(!result)
  {
    w('Failed to create corpus');
    return;
  }
  var corpusID = result;
  
  result = map.renameCorpus(corpusID, corpus_name + ':' + user);
  w(result);
  log(result, 'renameCorpus');
  
  
  result = map.getCorpus(corpusID);
  w(result);
  log(result, 'getCorpus');
  
  
  result = map.listCorpora(user);
  w(result);
  log(result, 'listCorpora');
  
  result = map.destroyCorpus(corpusID);
  w(result);
  log(result, 'destroyCorpus');
  
  result = map.listCorpora(user);
  w(result);
  log(result, 'listCorpora');
  ****/
  
  /**** Viewpoint 
  
  result = map.createViewpoint('Test Viewpoint', 'chao@zhou.fr');
  w(result);
  log(result, 'createViewpoint');
  var viewpointID = result;
  
  result = map.listViewpoints('chao@zhou.fr');
  w(result);
  log(result, 'listViewpoints');
  
  result = map.getViewpoint(viewpointID);
  w(result);
  log(result, 'getViewpoint');
  
  result = map.renameViewpoint(viewpointID, ' new name');
  w(result);
  log(result, 'renameViewpoint');
  
  result = map.getViewpoint(viewpointID);
  w(result);
  log(result, 'getViewpoint');
  
  result = map.destroyViewpoint(viewpointID);
  w(result);
  log(result, 'destroyViewpoint');
  
  result = map.listViewpoints('chao@zhou.fr');
  w(result);
  log(result, 'listViewpoints');
  **/
}

$(function(){
  HypertopicV2Test();
});