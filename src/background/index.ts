const DASHBOARD_URLS = [
  "https://www.lockdin.in",
  // "http://localhost:3000",
  // "http://127.0.0.1:3000",
];

const MAIN_DASHBOARD = DASHBOARD_URLS[0];

const SAFE_HOSTS: string[] = [
  // "localhost",
  // "127.0.0.1",
  // "localhost:3000",
  // "127.0.0.1:3000",
  "lockdin.in",
  "www.lockdin.in",
];

chrome.runtime.onMessageExternal.addListener((msg, sender, sendResponse) => {
  const allowedOrigins = DASHBOARD_URLS.map((u) => u.replace(/\/$/, ""));

  if (!allowedOrigins.includes(sender.origin || "")) {
    sendResponse({ success: false, error: "Origin not allowed" });
    return true;
  }

  (async () => {
    try {
      switch (msg.type) {
        case "PING":
          sendResponse({ pong: true });
          break;

        case "UPDATE_BLOCKED_SITES":
          if (!Array.isArray(msg.blockedSites)) {
            sendResponse({
              success: false,
              error: "Invalid blockedSites array",
            });
            return;
          }
          await chrome.storage.sync.set({ blockedSites: msg.blockedSites });
          await updateDeclarativeRules();
          sendResponse({ success: true });
          break;

        case "UPDATE_SESSION_BLOCKED_SITES":
          if (!Array.isArray(msg.sessionBlockedSites)) {
            sendResponse({
              success: false,
              error: "Invalid sessionBlockedSites array",
            });
            return;
          }
          await chrome.storage.sync.set({
            sessionBlockedSites: msg.sessionBlockedSites,
          });
          await updateDeclarativeRules();
          sendResponse({ success: true });
          break;

        default:
          sendResponse({ success: false, error: "Unknown message type" });
      }
    } catch (err) {
      sendResponse({ success: false, error: String(err) });
    }
  })();

  return true;
});

async function updateDeclarativeRules() {
  try {
    const { blockedSites = [] } = await chrome.storage.sync.get("blockedSites");
    const { sessionBlockedSites = [] } = await chrome.storage.sync.get(
      "sessionBlockedSites",
    );

    const allSites = [...new Set([...blockedSites, ...sessionBlockedSites])];

    const filteredSites = allSites.filter(
      (site) => !SAFE_HOSTS.some((safe) => site.includes(safe)),
    );

    const rules: chrome.declarativeNetRequest.Rule[] = [];
    let id = 1;

    filteredSites.forEach((site) => {
      let s = site.trim().toLowerCase();
      if (!s.includes(".")) s = `${s}.com`;

      rules.push({
        id: id++,
        priority: 999,
        action: {
          type: chrome.declarativeNetRequest.RuleActionType.REDIRECT,
          redirect: {
            url: `${MAIN_DASHBOARD}/blocked?from=${encodeURIComponent(s)}`,
          },
        },
        condition: {
          requestDomains: [s, `www.${s}`],
          resourceTypes: [chrome.declarativeNetRequest.ResourceType.MAIN_FRAME],
        },
      });
    });

    const existingRules = await chrome.declarativeNetRequest.getDynamicRules();
    const existingIds = existingRules.map((r) => r.id);

    await chrome.declarativeNetRequest.updateDynamicRules({
      removeRuleIds: existingIds,
      addRules: rules,
    });
  } catch (err) {}
}

chrome.runtime.onStartup.addListener(updateDeclarativeRules);
chrome.runtime.onInstalled.addListener(updateDeclarativeRules);

chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  if (changeInfo.status === "loading" && tab.url?.includes("/blocked")) {
    try {
      const blockedTabs = await chrome.tabs.query({
        url: DASHBOARD_URLS.map((u) => `${u}/blocked`),
      });
      if (blockedTabs.length > 1) {
        await chrome.tabs.update(blockedTabs[0].id!, { active: true });
        await chrome.tabs.remove(tabId);
      }
    } catch (err) {}
  }
});
