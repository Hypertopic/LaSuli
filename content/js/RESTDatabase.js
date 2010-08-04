/**
 * @param baseURL The database URL.
 *                example: http://127.0.0.1:5984/test/
 */
function RESTDatabase(baseUrl) {
	this._sourceName = "RESTDatabase.js";
	this.cache = {};

	if(!baseUrl || baseUrl == "")
	{
		error('baseUrl is empty', this._sourceName, arguments);
		return false;
	}
	baseUrl = (baseUrl.substr(-1) == "/") ? baseUrl : baseUrl + "/";
	this.baseUrl = baseUrl;
}

/**
 * @param object null if method is GET or DELETE
 * @return response body
 */
RESTDatabase.prototype.send = function(httpAction, httpUrl, httpBody)
{
	var _sourceName = this._sourceName;
	var _args = 'RESTDatabase.prototype.send';
	httpAction = (httpAction) ? httpAction : "GET";
	httpUrl = (httpUrl) ? httpUrl : this.baseUrl;

	httpBody = (!httpBody) ? "" : ((typeof(httpBody) == "object") ? JSON.stringify(httpBody) : httpBody);
	var result = null;
	$.ajax({
    type: httpAction,
    url: httpUrl,
    data: httpBody,
    dataType: 'json',
    processData: false,
    contentType: 'application/json',
    async: false,
    cache: false,
    success: function(response){
			result = response;
		},
		error: function(XMLHttpRequest, textStatus, errorThrown)
		{
			exception("Ajax Error, xhr.status: " + XMLHttpRequest.status + " " + XMLHttpRequest.statusText + "\nStatus:" + textStatus + ". \nRequest:\n" + httpAction + ' ' + httpUrl + "\n" + httpBody, _sourceName, _args);
			result = false;
		}
	});
	return result;
}

/**
 * @param object The object to create on the server.
 *               It is updated with an _id (and a _rev if the server features
 *               conflict management).
 */
RESTDatabase.prototype.post = function(object) {
	var _args = 'RESTDatabase.prototype.post';
	var body = this.send("POST", this.baseUrl, object);
	if(!body && !body.ok)
	{
		exception(object, this._sourceName, _args);
		return false;
	}
	log(object, this._sourceName, _args);
	object._id = body.id;
	if (body.rev)
		object._rev = body.rev;
	log(object, this._sourceName, _args);
	return object;
}

/**
 * @param query the path to get the view from the baseURL
 * @return the object or the object list that was read on the server
 */
RESTDatabase.prototype.get = function(query, force) {
	var _args = 'RESTDatabase.prototype.get';
	query = (query) ? this.baseUrl + query : '';
	if(this.cache[query] && !force)
		return this.cache[query];

	var body = this.send("GET", query, null);
	if(!body)
	{
		exception(query, this._sourceName, _args);
		return false;
	}
	this.cache[query] = body;
	return body;
}

/**
 * @param object the object to update on the server
 * (_id is mandatory, the server may need _rev for conflict management)
 * if the server features conflict management, the object is updated with _rev
 */
RESTDatabase.prototype.put = function(object) {
	var _args = 'RESTDatabase.prototype.put';
	var url = this.baseUrl + object._id;

	var body = this.send("PUT", url, object);
	if(!body && !body.ok)
	{
		exception(url, this._sourceName, _args);
		return false;
	}
	if(body.rev)
		object._rev = body.rev;
	return object;
}

/**
 * @param object the object to delete on the server
 * (_id is mandatory, the server may need _rev for conflict management)
 */
RESTDatabase.prototype.delete = function(object) {
	var _args = 'RESTDatabase.prototype.delete';
	var url = this.baseUrl + object._id;
	if(object._rev)
		url += "?rev=" + object._rev;

	var body = this.send("DELETE", url, null);
	if(!body)
	{
		exception(url, this._sourceName, _args);
		return false;
	}
	return true;
}