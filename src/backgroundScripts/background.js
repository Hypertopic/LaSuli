//Launching Webext
let currentTabId,
	currentUrl;

const errorHandler = function (error){ error => console.error(error)};

try{
	browser.windows.getCurrent({populate: true})
	.then(windowInfo => {
		windowInfo.tabs.forEach(tab => {
			if (tab.active) {
				currentTabId = tab.id;
				currentUrl = tab.url;
				if (currentUrl == undefined) {
					browser.tabs.reload(tab.id);
					currentUrl = tab.url;
				}
			}
		});
	});
}catch(e){errorHandler}

browser.browserAction.setBadgeText({text: `...`});

const updateHighlightNumber = async () => {
	try {
		const answer = await browser.tabs.sendMessage(currentTabId, {aim: `getAllHighlights`, data: currentUrl})
		browser.browserAction.setBadgeText({text: answer.returnMessage});
	} catch(e){
		browser.browserAction.setBadgeText({text: `err`});
	};
}

const handleUpdate = async (tabId, changeInfo, tabInfo) => {
	if (changeInfo.url) {
		currentUrl = changeInfo.url;
		currentTabId = tabId;
	}
}

const handleTabChange = async (activeInfo) => {
	console.log("Tab changed");
	currentTabId = activeInfo.tabId;
	console.log(currentTabId);
	try{
		tab = await browser.tabs.get(activeInfo.tabId);
		currentUrl = tab.url;
		console.log(currentUrl);
		browser.browserAction.setBadgeText({text: `...`});
	}catch(e){errorHandler}
}

const handleTabCreation = async (tab) => {
	currentTabId = tab.id;
	try{
		browser.browserAction.setBadgeText({text: `...`});
	}catch(e){errorHandler}
}

const handleExtensionButtonClick = async (tab) => {
	try {
		await browser.tabs.executeScript(currentTabId, {file: "/dist/content.js"});
		await updateHighlightNumber();
		let answer = await browser.tabs.sendMessage(currentTabId, {aim:`showHighlights`, data: currentUrl});
		console.log(answer.returnMessage);
	}catch(e){errorHandler}
}

browser.tabs.onUpdated.addListener(handleUpdate);
browser.tabs.onActivated.addListener(handleTabChange);
browser.tabs.onCreated.addListener(handleTabCreation);
browser.browserAction.onClicked.addListener(handleExtensionButtonClick);


