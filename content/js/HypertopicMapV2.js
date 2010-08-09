/*
HYPERTOPIC - Infrastructure for community-driven knowledge organization systems

OFFICIAL WEB SITE
http://www.hypertopic.org/

Copyright (C) 2010 Chao ZHOU, Aurelien Benel.

LEGAL ISSUES
This program is free software; you can redistribute it and/or modify it under
the terms of the GNU General Public License (version 3) as published by the
Free Software Foundation.
This program is distributed in the hope that it will be useful, but WITHOUT ANY
WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR A
PARTICULAR PURPOSE. See the GNU General Public License for more details:
http://www.gnu.org/licenses/gpl.html
*/

function HypertopicMapV2(baseUrl)
{
	this.cache = {};
	var db = new RESTDatabase(baseUrl);
}

/**
 * @param actor e.g. "cecile@hypertopic.org"
 */
HypertopicMapV2.prototype.listCorpora = function(actor) {
	return this.db.get("corpus/?actor=" + actor);
}

/**
 * @return corpusID
 */
HypertopicMapV2.prototype.createCorpus(name, actor){
	var object = {};
	object.corpus_name = name;
	object.actors = [];
	object.actors.push(actor);
	var result = this.db.post(object);
	return (!result) ? false : result._id;
}

HypertopicMapV2.prototype.renameCorpus(corpusID, name) {
	var object = this.db.get(corpusID);
	if(!object) return false;
	object.corpus_name = name;
	return this.db.put(object);
}

/**
 * Destroy the nodes of the corpus and of all its documents.
 */
HypertopicMapV2.prototype.destroyCorpus(corpusID)
{
	var object = this.db.get(corpusID);
	if(!object) return false;

	var result = this.db.delete(object);
	if(!result) return false;

	result = this.db.get("item/?corpus=" + corpusID);
	if(!result) return true;
	var rows = result.rows;
	for (var i=0, row; row = rows[i]; i++) {
		var documentID = row.key[0];
		object = this.db.get(documentID);
		this.db.delete(object);
	}
}

/**
 * @param corpus e.g. "MISS"
 * @param item e.g. null, or "d0" to get only an item and its fragments
 */
HypertopicMapV2.prototype.listItems(corpus, itemID){
	return this.db.get(
		"item/?corpus=" + corpus
		+ ((itemID != null) ? "&item=" + itemID : "")
	);
}


/**
 * @return itemID
 */
HypertopicMapV2.prototype.createItem(name, corpusID) {
	var object = {};
	object.item_name = name;
	object.item_corpus = corpusID;

	var result = this.db.post(object);
	return (!result) ? false : result._id;
}

HypertopicMapV2.prototype.destroyItem(itemID){
	var object = this.db.get(itemID);
	(!object)? return false: '';
	this.db.delete(object);
}

HypertopicMapV2.prototype.describeItem(itemID, attribute, value)
{
	var item = this.db.get(itemID);
	item.attribute.push(value);
	this.db.put(item);
}

HypertopicMapV2.prototype.undescribeItem(itemID, attribute, value)
{
	var item = this.db.get(itemID);
	item.attribute.remove(value);
	this.db.put(item);
}

HypertopicMapV2.prototype.tagItem(itemID, viewpointID, topicID)
{
//TODO
}

HypertopicMapV2.prototype.untagItem(itemID, viewpointID, topicID)
{
//TODO
}


HypertopicMapV2.prototype.tagFragment(itemID, coordinates, text, viewpointID, topicID)
{
	var item = this.db.get(itemID);
	var fragments = item.fragments;
	if (fragments==null)
		item.fragments = {};

	if (!item.fragments[coordinates]) {
		item.fragments[coordinates] = {};
		item.fragments[coordinates]text = text;
	}

	if (!item.fragments[coordinates].topics) {
		item.fragments[coordinates].topics = {};
		item.fragments[coordinates].topics = topics;
	}
	item.fragments[coordinates].topics[viewpointID] = topicID;
	this.db.put(item);
}


HypertopicMapV2.prototype.untagFragment(itemID, coordinates, viewpointID, topicID)
{
	var item = this.db.get(itemID);
	if(item.fragments[coordinates] && item.fragments[coordinates].topics)
		delete item.fragments[coordinates].topics[viewpointID];

	this.db.put(item);
}

//=================================================================== VIEWPOINT

/**
 * @param actor e.g. "cecile@hypertopic.org"
 */
HypertopicMapV2.prototype.listViewpoints(actor)
{
	return this.db.get("viewpoint/?actor=" + actor);
}

HypertopicMapV2.prototype.createViewpoint(name, actor)
{
	var viewpoint = {};
	viewpoint.viewpoint_name = name;
	viewpoint.actors = [ actor ];

	var result = this.db.post(viewpoint);
	return (!result) ? false : result._id;
}

HypertopicMapV2.prototype.destroyViewpoint(viewpointID)
{
	var viewpoint = this.db.get(viewpointID);
	if(!viewpoint) return false;
	return this.db.delete(viewpoint);
}

//TODO importViewpoint(XML, viewpointID?)
//TODO XML exportViewpoint(viewpointID)

//======================================================================= TOPIC

/**
 * @param topicID null for the virtual root
 * @return an object with broader, narrower and name
 */
HypertopicMapV2.prototype.getTopic(viewpointID, topicID)
{
//TODO
}

//==================================================================== RESOURCE

/**
 * @param resource e.g. "http://cassandre/text/d0"
 */
HypertopicMapV2.prototype.getResources(resource)
{
	return this.db.get("resource/?resource=" + resource);
}
