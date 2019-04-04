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

const setHLNumber = (number,tabId) => {
	var text;
	if (typeof number !== "number") text=null;
	else if (number < 0) text='…';
	else text=String(number);
	button.setBadgeText({text,tabId});
}

const updateHighlightNumber = async (tabId, url, refresh) => {
	// The page must be whitelisted
	let isOk = await model.isWhitelisted(url);
	if (!isOk) {
		button.setIcon({tabId});
		setHLNumber(false,tabId);
		return;
	} else {
		button.setIcon({
			path: {32: '/button/laSuli-32.png'},
			tabId
		});
	}

	// Get the number of highlights for this URL
	setHLNumber(-1,tabId);
	let resource = await model.getResource(url, refresh)
		.catch((e) => errorHandler(e, tabId));

	if (resource) {
		setHLNumber(resource.getHLCount(),tabId);
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
 * Open the sidebar when the button gets clicked
 */
button.onClicked.addListener(() => browser.sidebarAction.open());

/*
 * Message handler
 */
browser.runtime.onMessage.addListener(async (msg) => {
  switch (msg.aim) {
    case 'getResource':
      return model.getResource(msg.uri, msg.reload);
    case 'isWhitelisted':
      return model.isWhitelisted(msg.uri);
    case 'createViewpoint':
      return model.createViewpoint(msg.name);
    case 'createHighlight':
      return model.createHighlight(msg.uri,msg.viewpoint,msg.topic,msg.coordinates);
    case 'removeHighlight':
      return model.removeHighlight(msg.uri,msg.viewpoint,msg.topic,msg.fragId);
    case 'renameTopic':
      return model.renameTopic(msg.viewpoint,msg.topic,msg.newName);
    case 'setHLNumber':
      if (msg.count && msg.tabId) {
        return setHLNumber(msg.count,msg.tabId);
      }
    case 'fetchSession':
      return model.fetchSession();
    case 'openSession':
      return model.openSession(msg.user, msg.password);
    case 'closeSession':
      return model.closeSession();
  }
});
