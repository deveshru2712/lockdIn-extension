import { sendTokenToDashboard } from "./sendTokenToDashboard";

const DASHBOARD_URL = "http://localhost:3000";
const SAFE_HOSTS = [
  "localhost",
  "127.0.0.1",
  "localhost:3000",
  "127.0.0.1:3000",
];

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  (async () => {
    try {
      switch (message.type) {
        case "ADD_SITE": {
          const domain = extractDomain(message.site);
          if (!domain) {
            sendResponse({ success: false, error: "Invalid URL" });
            break;
          }

          //  Prevent blocking localhost or dashboard
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

chrome.runtime.onMessageExternal.addListener(
  (
    msg: {
      type: string;
      token?: string;
      blockedSites?: string[];
    },
    sender,
    sendResponse,
  ) => {
    const allowedOrigins = ["http://localhost:3000", "http://127.0.0.1:3000"];
    if (!allowedOrigins.includes(sender.origin || "")) {
      sendResponse({ success: false, error: "Origin not allowed" });
      return true;
    }

    (async () => {
      switch (msg.type) {
        case "PING":
          sendResponse({ pong: true });
          break;

        case "SAVE_TOKEN":
          await chrome.storage.sync.set({ token: msg.token });
          sendResponse({ success: true });
          break;

        case "DELETE_TOKEN":
          await chrome.storage.sync.remove("token");
          sendResponse({ success: true });
          break;

        case "UPDATE_BLOCKED_SITES":
          if (!Array.isArray(msg.blockedSites)) {
            sendResponse({
              success: false,
              error: "Invalid blockedSites array",
            });
            return;
          }

          const safeSites = (msg.blockedSites as string[]).filter(
            (s: string) => !SAFE_HOSTS.some((safe: string) => s.includes(safe)),
          );

          await chrome.storage.sync.set({ blockedSites: safeSites });
          await updateDeclarativeRules(safeSites);
          sendResponse({ success: true });
          break;

        default:
          sendResponse({ success: false, error: "Unknown message type" });
      }
    })();

    return true;
  },
);

async function updateDeclarativeRules(blockedSites: string[]) {
  try {
    const existingRules = await chrome.declarativeNetRequest.getDynamicRules();
    const existingIds = existingRules.map((r) => r.id);
    await chrome.declarativeNetRequest.updateDynamicRules({
      removeRuleIds: existingIds,
      addRules: [],
    });

    const allowLocalhostRule: chrome.declarativeNetRequest.Rule = {
      id: 9999,
      priority: 10,
      action: { type: chrome.declarativeNetRequest.RuleActionType.ALLOW },
      condition: {
        urlFilter: "|http*://localhost*|http*://127.0.0.1*",
        resourceTypes: ["main_frame"],
      },
    };

    const redirectRules: chrome.declarativeNetRequest.Rule[] = blockedSites
      .filter((site) => site && !SAFE_HOSTS.some((safe) => site.includes(safe)))
      .map((site, i) => ({
        id: i + 1,
        priority: 1,
        action: {
          type: chrome.declarativeNetRequest.RuleActionType.REDIRECT,
          redirect: { url: `${DASHBOARD_URL}/blocked` },
        },
        condition: {
          urlFilter: `*://${site}/*`,
          resourceTypes: ["main_frame"],
        },
      }));

    const allRules = [allowLocalhostRule, ...redirectRules];

    await chrome.declarativeNetRequest.updateDynamicRules({
      removeRuleIds: [],
      addRules: allRules,
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
  const { blockedSites } = await chrome.storage.sync.get("blockedSites");
  if (blockedSites && blockedSites.length > 0) {
    await updateDeclarativeRules(blockedSites);
  }
});

chrome.runtime.onInstalled.addListener(async () => {
  const { blockedSites } = await chrome.storage.sync.get("blockedSites");
  if (blockedSites && blockedSites.length > 0) {
    await updateDeclarativeRules(blockedSites);
  }
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
