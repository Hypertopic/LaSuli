function fetch(){
  if(!changeWorker.run) return;
  //dump("Interval:" + ((new Date()).getTime() - changeWorker.lastTime) + "\n");
  //changeWorker.lastTime = (new Date()).getTime();
  for(var server in changeWorker.servers)
  {
    var baseUrl = changeWorker.servers[server].baseUrl;
    var changeUrl = baseUrl + "_changes"
    if(!changeWorker.sequences[server])
    {
      var seq = getLastSeq(changeUrl);
      //dump(seq);
      if(seq < 0)
      {
        changeWorker.timeoutID = setTimeout("fetch()", 5000);
        return false;
      }
      changeWorker.sequences[server] = seq;
    }
    changeUrl += "?since=" + changeWorker.sequences[server];

    var req = new XMLHttpRequest();
    req.open("GET", changeUrl, true);
    req.onload = function()
    {
      var seq = -1;
      try{
        var result = JSON.parse(req.responseText.trim());
        if(!changeWorker.sequences[server] || changeWorker.sequences[server] < result.last_seq)
        {
          dump(server);
          changeWorker.sequences[server] = result.last_seq;
          postMessage(server);
        }
      }catch(e){}
    }
    req.send(null);
  }
  changeWorker.timeoutID = setTimeout("fetch()", 5000);
}

function getLastSeq(url){
  //dump(url);
  var req = new XMLHttpRequest();
  req.open("GET", url, false);
  req.send(null);
  if(req.status == "200" || req.status == "304")
    try{
      var result = JSON.parse(req.responseText.trim());
      return result.last_seq;
    }catch(e){
      dump("Get last sequence no error");
    }
  return -1;
}

var changeWorker = {
  lastTime: (new Date()).getTime(),
  servers : null,
  run : true,
  sequences: {},

  start: function(HtServers){
    this.run = true;
    this.servers = HtServers;
    this.sequences = {};
    dump("Listner start\n");
    fetch();
  },

  shutdown: function(){
    this.run = false;
    if(typeof this.timeoutID == "number") {
      dump("clear timeout\n");
      clearTimeout(this.timeoutID);
      delete this.timeoutID;
    }
    dump("Listner shutdown\n");
  }
}

onmessage = function(event){
  if(typeof(event.data) == "object")
  {
    changeWorker.start(event.data);
  }
  else
  {
    changeWorker.shutdown();
  }
}