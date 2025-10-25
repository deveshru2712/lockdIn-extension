import { sendTokenToDashboard } from "./sendTokenToDashboard";

const DASHBOARD_URL = "http://localhost:3000";
const SAFE_HOSTS: string[] = [
  "localhost",
  "127.0.0.1",
  "localhost:3000",
  "127.0.0.1:3000",
];

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  (async () => {
    try {
      switch (message.type) {
        case "ADD_SITE": {
          const domain = extractDomain(message.site);
          if (!domain) {
            sendResponse({ success: false, error: "Invalid URL" });
            break;
          }

          if (SAFE_HOSTS.some((safe) => domain.includes(safe))) {
            sendResponse({
              success: false,
              error: "Cannot block localhost or dashboard",
            });
            break;
          }

          const result = await sendTokenToDashboard({
            action: "ADD_SITE",
            site: domain,
          });
          sendResponse(result);
          break;
        }

        case "GET_CURRENT_TAB": {
          const tabs = await chrome.tabs.query({
            active: true,
            currentWindow: true,
          });
          const tab = tabs[0];
          sendResponse({ url: tab?.url || "" });
          break;
        }

        default:
          sendResponse({ success: false, error: "Unknown message type" });
      }
    } catch (err) {
      sendResponse({ success: false, error: String(err) });
    }
  })();
  return true;
});

chrome.runtime.onMessageExternal.addListener((msg, sender, sendResponse) => {
  const allowedOrigins = ["http://localhost:3000", "http://127.0.0.1:3000"];
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
    const safeFiltered = allSites.filter(
      (site) => !SAFE_HOSTS.some((safe) => site.includes(safe)),
    );

    const rules: chrome.declarativeNetRequest.Rule[] = safeFiltered.map(
      (site, i) => ({
        id: i + 1,
        priority: 1,
        action: {
          type: chrome.declarativeNetRequest.RuleActionType.REDIRECT,
          redirect: { url: `${DASHBOARD_URL}/blocked` },
        },
        condition: {
          urlFilter: `*${site}*`,
          resourceTypes: ["main_frame"],
        },
      }),
    );

    const existingRules = await chrome.declarativeNetRequest.getDynamicRules();
    const existingIds = existingRules.map((r) => r.id);

    await chrome.declarativeNetRequest.updateDynamicRules({
      removeRuleIds: existingIds,
      addRules: rules,
    });
  } catch (err) {
    console.error("Failed to update DNR rules:", err);
  }
}

function extractDomain(url: string): string | null {
  try {
    const { hostname } = new URL(url);
    return hostname.replace(/^www\./, "").toLowerCase();
  } catch {
    return null;
  }
}

chrome.runtime.onStartup.addListener(async () => {
  const { blockedSites = [] } = await chrome.storage.sync.get("blockedSites");
  const { sessionBlockedSites = [] } = await chrome.storage.sync.get(
    "sessionBlockedSites",
  );
  if (blockedSites.length > 0 || sessionBlockedSites.length > 0)
    await updateDeclarativeRules();
});

chrome.runtime.onInstalled.addListener(async () => {
  const { blockedSites = [] } = await chrome.storage.sync.get("blockedSites");
  const { sessionBlockedSites = [] } = await chrome.storage.sync.get(
    "sessionBlockedSites",
  );
  if (blockedSites.length > 0 || sessionBlockedSites.length > 0)
    await updateDeclarativeRules();
});

chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  if (changeInfo.status === "loading" && tab.url?.includes("/blocked")) {
    try {
      const blockedTabs = await chrome.tabs.query({
        url: ["http://localhost:3000/blocked", "http://127.0.0.1:3000/blocked"],
      });
      if (blockedTabs.length > 1) {
        await chrome.tabs.update(blockedTabs[0].id!, { active: true });
        await chrome.tabs.remove(tabId);
      }
    } catch (err) {
      console.error("Error handling duplicate /blocked tabs:", err);
    }
  }
});
