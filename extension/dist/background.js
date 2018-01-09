/******/ (function(modules) { // webpackBootstrap
/******/ 	// The module cache
/******/ 	var installedModules = {};
/******/
/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {
/******/
/******/ 		// Check if module is in cache
/******/ 		if(installedModules[moduleId]) {
/******/ 			return installedModules[moduleId].exports;
/******/ 		}
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = installedModules[moduleId] = {
/******/ 			i: moduleId,
/******/ 			l: false,
/******/ 			exports: {}
/******/ 		};
/******/
/******/ 		// Execute the module function
/******/ 		modules[moduleId].call(module.exports, module, module.exports, __webpack_require__);
/******/
/******/ 		// Flag the module as loaded
/******/ 		module.l = true;
/******/
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/
/******/
/******/ 	// expose the modules object (__webpack_modules__)
/******/ 	__webpack_require__.m = modules;
/******/
/******/ 	// expose the module cache
/******/ 	__webpack_require__.c = installedModules;
/******/
/******/ 	// define getter function for harmony exports
/******/ 	__webpack_require__.d = function(exports, name, getter) {
/******/ 		if(!__webpack_require__.o(exports, name)) {
/******/ 			Object.defineProperty(exports, name, {
/******/ 				configurable: false,
/******/ 				enumerable: true,
/******/ 				get: getter
/******/ 			});
/******/ 		}
/******/ 	};
/******/
/******/ 	// getDefaultExport function for compatibility with non-harmony modules
/******/ 	__webpack_require__.n = function(module) {
/******/ 		var getter = module && module.__esModule ?
/******/ 			function getDefault() { return module['default']; } :
/******/ 			function getModuleExports() { return module; };
/******/ 		__webpack_require__.d(getter, 'a', getter);
/******/ 		return getter;
/******/ 	};
/******/
/******/ 	// Object.prototype.hasOwnProperty.call
/******/ 	__webpack_require__.o = function(object, property) { return Object.prototype.hasOwnProperty.call(object, property); };
/******/
/******/ 	// __webpack_public_path__
/******/ 	__webpack_require__.p = "";
/******/
/******/ 	// Load entry module and return exports
/******/ 	return __webpack_require__(__webpack_require__.s = 33);
/******/ })
/************************************************************************/
/******/ ({

/***/ 33:
/***/ (function(module, exports) {

//Launching Webext
let currentTabId, currentUrl;

const errorHandler = function (error) {
	error => console.error(error);
};

try {
	browser.windows.getCurrent({ populate: true }).then(windowInfo => {
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
} catch (e) {
	errorHandler;
}

browser.browserAction.setBadgeText({ text: `...` });

const updateHighlightNumber = async () => {
	try {
		const answer = await browser.tabs.sendMessage(currentTabId, { aim: `getAllHighlights`, data: currentUrl });
		browser.browserAction.setBadgeText({ text: answer.returnMessage });
	} catch (e) {
		browser.browserAction.setBadgeText({ text: `err` });
	};
};

const handleUpdate = async (tabId, changeInfo, tabInfo) => {
	if (changeInfo.url) {
		currentUrl = changeInfo.url;
		currentTabId = tabId;
		browser.browserAction.setBadgeText({ text: `...` });
		await browser.tabs.executeScript(currentTabId, { file: "/dist/content.js" });
	}
};

const handleTabChange = async activeInfo => {
	currentTabId = activeInfo.tabId;
	try {
		tab = await browser.tabs.get(activeInfo.tabId);
		currentUrl = tab.url;
		browser.browserAction.setBadgeText({ text: `...` });
	} catch (e) {
		errorHandler;
	}
};

const handleTabCreation = async tab => {
	currentTabId = tab.id;
	try {
		browser.browserAction.setBadgeText({ text: `...` });
	} catch (e) {
		errorHandler;
	}
};

const handleExtensionButtonClick = async tab => {
	try {
		await updateHighlightNumber();
		let answer = await browser.tabs.sendMessage(currentTabId, { aim: `showHighlights`, data: currentUrl });
		console.log(answer.returnMessage);
	} catch (e) {
		errorHandler;
	}
};

browser.tabs.onUpdated.addListener(handleUpdate);
browser.tabs.onActivated.addListener(handleTabChange);
browser.tabs.onCreated.addListener(handleTabCreation);
browser.browserAction.onClicked.addListener(handleExtensionButtonClick);

/***/ })

/******/ });
//# sourceMappingURL=background.js.map