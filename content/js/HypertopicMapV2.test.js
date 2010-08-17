$(function(){
  new Test.Unit.Runner({
    /*corpusID, itemID, viewpointID, topicID, childTopicID, otherTopicID,
    
    map,*/
    
    setup: function() {
      this.map = new HypertopicMapV2('http://127.0.0.1/argos_dev/');
      this.corpusID = this.map.createCorpus("my corpus", "me");
    	this.itemID = this.map.createItem("my item", this.corpusID);
    	this.viewpointID = this.map.createViewpoint("my viewpoint", "me");
    	this.topicID = this.map.createTopicIn(
    		this.viewpointID, new Array()
    	);
    	var broader = new Array();
    	broader.push(this.topicID);
    	this.childTopicID = this.map.createTopicIn(this.viewpointID, broader);
    	this.otherTopicID = this.map.createTopicIn(
    		this.viewpointID, new Array()
    	);
    },
    
    teardown: function() {
      // Do nothing
    },
    
    testRegister: function() { 
      with(this) {
      result = map.register(corpusID, "him");
    	var corpus = map.get(corpusID);
    	assertEqual(2, corpus.users.length);
      }
    },
    
    testUnregister: function() {
      with(this) {
  	    map.register(corpusID, "him");
  	    map.unregister(corpusID, "me");
  	    var corpus = map.get(corpusID);
  	    assertEqual(1, corpus.users.length);
  	  }
    },
    
    testRenameCorpus: function() {
      with(this) {
  	    map.renameCorpus(corpusID, "new name");
  	    var corpus = map.get(corpusID);
	      assertEqual("new name", corpus.corpus_name);
  	  }
    },
    
    testDescribeItem: function() {
      with(this) {
  	    var result = map.describeItem(corpusID, "foo", "bar");
	      assert(result);
  	  }
    },
    
    testUndescribeItem: function() {
      with(this) {
  	    var result = map.describeItem(corpusID, "foo", "bar");
  	    result = map.undescribeItem(this.itemID, "foo", "bar");
	      assert(result);
  	  }
    },
    
    testTagItem: function() {
      with(this) {
  	    var result = map.tagItem(itemID, viewpointID, topicID);
	      assert(result);
  	  }
    },
    
    testUntagItem: function() {
      with(this) {
  	    var result = map.tagItem(itemID, viewpointID, topicID);
  	    result = map.untagItem(itemID, viewpointID, topicID);
	      assert(result);
  	  }
    },
    
    testTagFragment: function() {
      with(this) {
        var coordinates = new Array(1024, 1096);
  	    var result = map.tagFragment(itemID, coordinates, viewpointID, topicID);
	      assert(result);
  	  }
    },
    
    testUntagFragment: function() {
      with(this) {
  	    var coordinates = new Array(1024, 1096);
  	    var highlightID = map.tagFragment(
      		itemID, coordinates, "", viewpointID, topicID
      	);
      	
  	    var result = map.untagFragment(itemID, highlightID);
	      assert(result);
  	  }
    },
    
    testRenameTopic: function() {
      with(this) {
  	    var result = map.renameTopic(viewpointID, topicID, "a topic");
	      assert(result);
  	  }
    },
    
    /*testMoveTopicsIn: function() {
      with(this) {
        var broader = new Array(childTopicID);
        
  	    var result = map.moveTopicsIn(broader, viewpointID, otherTopicID);
	      assert(result);
  	  }
    },*/
    
    testLinkTopicsIn: function() {
      with(this) {
        var broader = new Array(childTopicID);
        
  	    var result = map.moveTopicsIn(broader, viewpointID, otherTopicID);
	      assert(result);
  	  }
    },
    
    testGetTopic: function() {
      with(this) {
        /*var result = map.getTopic(viewpointID, null);
        log(result);
        assertEqual(2, result.narrower.length);*/
        log(viewpointID, "Viewpoint ID");
        log(topicID, "topic ID");
        log(otherTopicID, "otherTopic ID");
        log(map.get('viewpoint/' + viewpointID));
  	    result = map.getTopic(viewpointID, topicID);
  	    log(result);
  	    var narrower = result.narrower;
  	    
	      assertEqual(1, narrower.length);
  	  }
    },

    testListCorpora: function() {
      with(this) {
  	    var result = map.listCorpora("me");
	      assert(result);
  	  }
    },
    
    testGetCorpus: function() {
      with(this) {
  	    var result = map.getCorpus(corpusID);
	      assert(result);
  	  }
    },
    
    testGetItem: function() {
      with(this) {
  	    var result = map.getItem(corpusID, itemID);
	      assert(result);
  	  }
    },
    
    testListViewpoints: function() {
      with(this) {
  	    var result = map.listViewpoints("me");
	      assert(result);
  	  }
    },
    
    testDestroyTopic: function() {
      with(this) {
        log(otherTopicID, "[testDestroyTopic] otherTopicID");
  	    var result = map.destroyTopic(viewpointID, otherTopicID);
	      assert(result);
	      map.destroyTopic(viewpointID, childTopicID);
	      assert(result);
        map.destroyTopic(viewpointID, topicID);
        assert(result);
  	  }
    },
    
    testDestroyViewpoint: function() {
      with(this) {
  	    var result = map.destroyViewpoint(viewpointID);
	      assert(result);
  	  }
    },
    
    testDestroyItem: function() {
      with(this) {
  	    var result = map.destroyItem(itemID);
	      assert(result);
  	  }
    },
    
    testDestroyCorpus: function() {
      with(this) {
  	    var result = map.destroyCorpus(corpusID);
	      assert(result);
  	  }
    }
  });
});