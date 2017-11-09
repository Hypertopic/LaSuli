const hypertopic = require('hypertopic');
const getStdin = require('get-stdin');

let db = hypertopic([
  "http://argos2.test.hypertopic.org",
  "http://steatite.hypertopic.org"
]);

function handleUpdated(tabId, changeInfo, tabInfo) {
	if (changeInfo.url) {
		db.getView(`/item/?resource=${changeInfo.url}`)
		.then( (x) => {
			let itemsPart = x[Object.keys(x)]; // items of the answer
			let promiseArray = [];
			if (itemsPart) {
				let itemList = Object.keys(itemsPart); // Lists of items
				itemList.map((item) => { //Going throw each item
					itemsPart[item].map((itemContent) => {
						promiseArray.push(
							db.getView(`/item/${itemContent.corpus}/${itemContent.id}`)
							.then(answer => {
								return Object.keys(answer[itemContent.corpus][itemContent.id]).length-2;
							})
						);
					});
				});
			}
			return Promise.all(promiseArray);
		})
		.then((fragments) => {
			browser.browserAction.setBadgeText({text: fragments.reduce((a, b) => a + b, 0).toString()}); //sum fragments table numbers
		});
	}
}
browser.tabs.onUpdated.addListener(handleUpdated);
