var tabs = require("sdk/tabs");

const ABOUT_URI = /^about:/;

function handleURI(tab, next) {
  if (!ABOUT_URI.test(tab.url)) {
    dispatch("lasuli.ui.doUnBlockUI");
    next(tab);
  } else {
    dispatch("lasuli.ui.doClearDocumentPanel");
    dispatch("lasuli.ui.doBlockUI");
  }
}

tabs.on("load", function(tab) {
  handleURI(tab, function(t) {
    console.log('tabWatcher: ' + t.url + ' is shown for the first time');
    // Show highlights and update document tab
    dispatch("lasuli.core.doLocationChange", true);
  });
});

tabs.on("activate", function(tab) {
  if (tab.readyState=='complete') {
    handleURI(tab, function(t) {
      console.log('tabWatcher: ' + t.url + ' is shown again');
      // Close viewpoint tabs and update document tab
      dispatch("lasuli.core.doLocationChange", false);
    });
  }
});

