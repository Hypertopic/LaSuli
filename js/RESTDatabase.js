
/**
 * @param object null if method is GET or DELETE
 * @return response body
 */
function send(httpAction, httpUrl, httpBody)
{
	httpBody = (!httpBody) ? "" : ((typeof(httpBody) == "object") ? JSON.stringify(httpBody) : httpBody);
	var result = null;
	$.ajax({
    type: httpAction,
    url: httpUrl,
    data: httpBody,
    async: false,
    cache: false,
    success: function(response){
    	info(response);
			result = response;
		},
		error: function(XMLHttpRequest, textStatus, errorThrown)
		{
			info("Ajax Error, Status:" + textStatus + ". Request:\n" + httpAction + ' ' + httpUrl + "\n" + httpBody);
			info(errorThrown);
			result = false;
		}
	});
	return result;
}

/**
 * @param baseURL The database URL.
 *                example: http://127.0.0.1:5984/test/
 */
function RESTDatabase(baseUrl) {
	if(!baseUrl || baseUrl == "")
		return false;
	baseUrl = (baseUrl.substr(-1) == "/") ? baseUrl : baseUrl + "/";
	this.baseUrl = baseUrl;
}

/**
 * @param object The object to create on the server.
 *               It is updated with an _id (and a _rev if the server features
 *               conflict management).
 */
RESTDatabase.prototype.post = function(obj) {

}