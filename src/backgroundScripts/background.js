/*global browser */
/*
 * This script displays a browser action (toolbar button)
 */

const errorHandler = (error) => console.error(error);

let button = browser.browserAction,
	tabs = browser.tabs,
	cache = {};

browser.windows.getCurrent({populate: true}).then((window) => {
	window.tabs.forEach(tab => {
		if (tab.active && tab.url === undefined) {
			browser.tabs.reload(tab.id);
		}
	});
});

button.setBadgeBackgroundColor({color: '#333'});

const updateHighlightNumber = async (tabId, url, refresh) => {
	button.setBadgeText({text: null, tabId});

	// Get the number of highlights for this URL
	if (refresh || !cache[url]) {
		button.setBadgeText({text: '…', tabId});
		await tabs.executeScript(tabId, {
			file: '/dist/content.js'
		});

		const answer = await tabs.sendMessage(tabId, {
			aim: 'getAllHighlights',
			data: url
		}).catch(errorHandler);

		cache[url] = (answer)
			? answer.returnMessage
			: 'err';
	}
	button.setBadgeText({text: cache[url], tabId});
};

/*
 * Update the highlights when the URI changes
 */
tabs.onUpdated.addListener(async (tabId, changeInfo) => {
	if (changeInfo.url) {
		await updateHighlightNumber(tabId, changeInfo.url, true);
	}
});

/*
 * Update the highlights when a tab is accessed
 */
tabs.onActivated.addListener(async (activeInfo) => {
	try {
		let tab = await tabs.get(activeInfo.tabId);
		await updateHighlightNumber(tab.id, tab.url, false);
	} catch (e) {
		errorHandler(e);
	}
});

/*
 * Display the highlights when the button gets clicked
 */
button.onClicked.addListener(async (tab) => {
	await tabs.sendMessage(tab.id, {
		aim: 'showHighlights',
		data: tab.url
	}).catch(errorHandler);
});

