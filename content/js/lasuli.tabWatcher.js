var tabs = require("sdk/tabs");

const ABOUT_URI = /^about:/;

function handleURI(tab, next) {
  dispatch("lasuli.ui.doCloseViewpointPanel");
  dispatch("lasuli.ui.doClearDocumentPanel");
  if (!ABOUT_URI.test(tab.url)) {
    dispatch("lasuli.ui.doUnBlockUI");
    next(tab);
  } else {
    dispatch("lasuli.ui.doBlockUI");
  }
}

tabs.on("load", function(tab) {
  handleURI(tab, function(t) {
    console.log('tabWatcher: ' + t.url + ' is shown for the first time');
    // Show highlights and update document tab
    dispatch("lasuli.core.doLoadDocument");
  });
});

tabs.on("activate", function(tab) {
  if (tab.readyState=='complete') {
    handleURI(tab, function(t) {
      console.log('tabWatcher: ' + t.url + ' is shown again');
      // Update document tab
      dispatch("lasuli.core.doLoadDocument");
    });
  }
});

