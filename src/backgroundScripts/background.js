/*global browser */
import model from './model.js';

/*
 * This script displays a browser action (toolbar button)
 * and manages the whitelist
 */

const errorHandler = (error, tabId) => {
  console.error(error);
  if (!(error instanceof DOMException)) {
    browser.notifications.create({
      type:"basic",
      title:"LaSuli error",
      message:String(error)
    });
  }
  return Promise.reject();
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
  return button.setBadgeText({text,tabId});
}

const updateHighlightNumber = async (tabId, url, refresh) => {
  // The page must be whitelisted
  let isOk = await model.isWhitelisted(url);
  if (!isOk) {
    return button.setIcon({tabId}).then(x => {
      return setHLNumber(false,tabId);
    });
  } else {
    return button.setIcon({
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
  let res;
  switch (msg.aim) {
    case 'getResource':
      res=model.getResource(msg.uri, msg.reload);
      break;
    case 'isWhitelisted':
      res=model.isWhitelisted(msg.uri);
      break;
    case 'createViewpoint':
      res=model.createViewpoint(msg.name);
      break;
    case 'createHighlight':
      res=model.createHighlight(msg.uri,msg.viewpoint,msg.topic,msg.coordinates);
      break;
    case 'removeHighlight':
      res=model.removeHighlight(msg.uri,msg.viewpoint,msg.topic,msg.fragId);
      break;
    case 'renameTopic':
      res=model.renameTopic(msg.viewpoint,msg.topic,msg.newName);
      break;
    case 'setHLNumber':
      res=setHLNumber(msg.count,msg.tabId);
      break;
    case 'fetchSession':
      res=model.fetchSession();
      break;
    case 'openSession':
      res=model.openSession(msg.user, msg.password);
      break;
    case 'closeSession':
      res=model.closeSession();
      break;
    default:
      res=Promise.reject("unknown message "+$msg.aim);
  }
  return res.catch(errorHandler);
});
