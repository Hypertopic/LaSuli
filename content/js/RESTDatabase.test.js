$(function(){
  var db = new RESTDatabase('http://127.0.0.1:5984/test/');

  //Create a new object
  var doc = {};
  doc.name = "Bond";
  db.post(doc);
  log(doc, "[RESTDatabase.test.js]Testing POST");

  var allDocs = db.get("_all_docs?include_docs=true");
  log(allDocs, "[RESTDatabase.test.js]Testing GET all documents");

  doc.name = "James Bond";
  db.put(doc);
  log(doc, "[RESTDatabase.test.js]Testing PUT");

  allDocs = db.get("_all_docs?include_docs=true");
  log(allDocs, "[RESTDatabase.test.js]Testing GET all documents without force reload");

  allDocs = db.get("_all_docs?include_docs=true", true);
  log(allDocs, "[RESTDatabase.test.js]Testing GET all documents with force reload");

  db.delete(doc);
  allDocs = db.get("_all_docs?include_docs=true", true);
  log(allDocs, "[RESTDatabase.test.js]Testing get all documents after the delete");
});