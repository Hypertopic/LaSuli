function w(str)
{
  str = (typeof(str) == "string") ? str : JSON.stringify(str);
  $('#result').html($('#result').html() + "<p>" + str + "</p>");
}

function HypertopicV2Test()
{
  var user = 'chao@zhou.fr';
  var corpus_name = 'Testing';
  var map = new HypertopicMapV2('http://127.0.0.1/argos_dev/_design/argos/_rewrite/');
  var result;
  /**** Corpus or Viewpoint
  result = map.register('5a03d6d794ec4b9215f7cba8600c24db', 'chao@zhou.fr');
  w(result);
  result = map.unregister('5a03d6d794ec4b9215f7cba8600c24db', 'chao@zhou.fr');
  w(result);
  ****/
  
  result = map.createCorpus(corpus_name,user);
  if(!result)
  {
    w('Failed to create corpus');
    return;
  }
  var corpusID = result;
  result = map.renameCorpus(corpusID, corpus_name + ':' + user);
  w(result);
  
  result = map.getCorpus(corpusID);
  w(result);
  
  result = map.listCorpora(user);
  w(result);
  
  result = map.destroyCorpus(corpusID);
  w(result);
  
  result = map.listCorpora(user);
  w(result);
  
}

$(function(){
  HypertopicV2Test();
});