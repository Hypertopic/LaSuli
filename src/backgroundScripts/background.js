let currentTabId,
	currentUrl;

browser.browserAction.setBadgeText({text: `...`});

const errorHandler = function (error){ error => console.error(error)};

const updateHighlightNumber = async () => {
	try {
		const answer = await browser.tabs.sendMessage(currentTabId, {aim: `getAllHighlights`, data: currentUrl})
		browser.browserAction.setBadgeText({text: answer.returnMessage});
	} catch(e){browser.browserAction.setBadgeText({text: `err`})};
}

const handleUpdate = async (tabId, changeInfo, tabInfo) => {
	if (changeInfo.url) {
		currentUrl = changeInfo.url;
		currentTabId = tabId;
		try {
			await browser.tabs.executeScript(currentTabId, {file: "/dist/content.js"});
			await updateHighlightNumber();
		} catch(e) {errorHandler(e)};
	}
}

const handleTabChange = async (activeInfo) => {
	try{
		currentUrl = (await browser.tabs.get(activeInfo.tabId)).url;
		updateHighlightNumber();
	}catch(e){errorHandler}
}

const handleExtensionButtonClick = async () => {
	try {
		if (await browser.browserAction.getBadgeText({}) != "...") {
			console.log("clicked and not ...");
			let answer = await browser.tabs.sendMessage(currentTabId, {aim:`showHighlights`, data: currentUrl});
			console.log(answer.returnMessage);
		}
	}catch(e){errorHandler}
}


browser.tabs.onUpdated.addListener(handleUpdate);
browser.tabs.onActivated.addListener(handleTabChange);
browser.browserAction.onClicked.addListener(handleExtensionButtonClick);

