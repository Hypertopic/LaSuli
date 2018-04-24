/*global browser */
/*
 * This script displays a browser action (toolbar button)
 * and manages the whitelist
 */

const errorHandler = (error) => console.error(error);

const getDomain = (uri) => {
	let anchor = document.createElement('a');
	anchor.href = uri;
	return anchor.hostname;
};

const isWhitelisted = async (domain) => {
	let match = await browser.storage.local.get('whitelist');
	let list = match['whitelist'];
	if (!list) {
		await browser.storage.local.set({
			whitelist: ['cassandre.hypertopic.org']
		});
		return false;
	} else {
		return (list.indexOf(domain) !== -1);
	}
};

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
	// The page must be whitelisted
	let isOk = await isWhitelisted(getDomain(url));
	if (!isOk) {
		button.setIcon({tabId});
		button.setBadgeText({text: null, tabId});
		return;
	} else {
		button.setIcon({
			path: {32: '/button/laSuli-32.png'},
			tabId
		});
	}

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

