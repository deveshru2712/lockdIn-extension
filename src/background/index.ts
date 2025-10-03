// --- Dashboard URL (switch between local and prod if needed) ---
const DASHBOARD_URL = "http://localhost:3000";

// --- Blocklist checking ---
function isBlocked(url: string, blockedSites: string[]): boolean {
  return blockedSites.some((site) => url.includes(site));
}

chrome.tabs.onActivated.addListener(async (activeInfo) => {
  const tab = await chrome.tabs.get(activeInfo.tabId);
  if (!tab.url) return;

  chrome.storage.sync.get("blockedSites", (data) => {
    const blockedSites = data.blockedSites || [];
    if (isBlocked(tab.url!, blockedSites)) {
      chrome.tabs.update(tab.id!, {
        url: DASHBOARD_URL,
      });
    }
  });
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === "complete" && tab.url) {
    chrome.storage.sync.get("blockedSites", (data) => {
      const blockedSites = data.blockedSites || [];
      if (isBlocked(tab.url!, blockedSites)) {
        chrome.tabs.update(tabId, {
          url: DASHBOARD_URL,
        });
      }
    });
  }
});

// @ts-ignore
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type === "GET_CURRENT_TAB") {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      sendResponse({ url: tabs[0]?.url });
    });
    return true;
  }

  if (msg.type === "ADD_SITE") {
    chrome.storage.sync.get("blockedSites", (data) => {
      const sites = data.blockedSites || [];
      if (!sites.includes(msg.url)) {
        sites.push(msg.url);
        chrome.storage.sync.set({ blockedSites: sites }, () => {
          sendResponse({ success: true });
        });
      } else {
        sendResponse({ success: false, reason: "Already blocked" });
      }
    });
    return true;
  }

  if (msg.type === "REMOVE_SITE") {
    chrome.storage.sync.get("blockedSites", (data) => {
      const sites = data.blockedSites || [];
      const updated = sites.filter((s: string) => s !== msg.url);
      chrome.storage.sync.set({ blockedSites: updated }, () => {
        sendResponse({ success: true });
      });
    });
    return true;
  }
});
