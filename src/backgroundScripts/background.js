/*global browser */
import model from './model.js';

/*
 * This script displays a browser action (toolbar button)
 * and manages the whitelist
 */

const errorHandler = (error, tabId) => {
	console.error(error);
	button.setBadgeText({text: 'err', tabId});
};

let button = browser.browserAction,
	tabs = browser.tabs;

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
	let isOk = await model.isWhitelisted(url);
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
	button.setBadgeText({text: '…', tabId});
	let resource = await model.getResource(url, refresh)
		.catch((e) => errorHandler(e, tabId));

	if (resource) {
		let text = String(resource.getHLCount());
		button.setBadgeText({text, tabId});
	}
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
		errorHandler(e, activeInfo.tabId);
	}
});

/*
 * Display the highlights when the button gets clicked
 */
button.onClicked.addListener(async (tab) => {
	// Check whether the tab knows the script
	await tabs.sendMessage(tab.id, {aim: 'isLoaded'})
		.catch(async () => {
			await tabs.executeScript(tab.id, {
				file: '/dist/content.js'
			});
		});
	// Show highlights
	await tabs.sendMessage(tab.id, {
		aim: 'showHighlights',
		data: tab.url
	}).catch(errorHandler);

	// Open the sidebar
	browser.sidebarAction.open();
});

