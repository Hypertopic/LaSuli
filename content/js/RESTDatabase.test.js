$(function(){
	var db = new RESTDatabase('http://127.0.0.1:5984/test/');

	/*
	var o = {};
	o.name = "Bond";
	db.post(o);
	*/

	var allDocs = db.get("_all_docs?include_docs=true");
	log(allDocs, "RESTDatabase.test.js", "GET Test");
	var allDocs = db.get("_all_docs?include_docs=true");
	var allDocs = db.get("_all_docs?include_docs=true");
	var allDocs = db.get("_all_docs?include_docs=true");
});