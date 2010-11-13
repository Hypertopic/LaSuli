function fetch(){
  if(!changeWorker.run) return;

  for(var server in changeWorker.servers)
  {
    var baseUrl = changeWorker.servers[server].baseUrl;
    var changeUrl = baseUrl + "_changes"
    if(changeWorker.sequences[server])
      changeUrl += "?since=" + changeWorker.sequences[server];

    var httpRequest = new XMLHttpRequest();
    httpRequest.open("GET", changeUrl, false);
    httpRequest.onload = function infoReceived()
    {
      var output = httpRequest.responseText;
      if (output) {
        var result = JSON.parse(output.trim());
        var seq = -1;
        try{
          seq = parseInt(result.last_seq);
        }catch(e){}
        //postMessage(changeWorker.sequences[server] + "," + seq);
        if(!changeWorker.sequences[server] || changeWorker.sequences[server] < seq)
        {
          changeWorker.sequences[server] = seq;
          postMessage(server);
        }
      }
      httpRequest = null;
    }
    httpRequest.send(null);
    //postMessage('fetch:' + changeUrl);
  }
  setTimeout("fetch()", 5000);
}

var changeWorker = {
  servers : null,
  run : true,
  sequences: {},

  start: function(HtServers){
    this.run = true;
    this.servers = HtServers;
    this.sequences = {};
    fetch();
  },

  shutdown: function(){
    this.run = false;
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