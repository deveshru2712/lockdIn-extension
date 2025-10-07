import { sendTokenToDashboard } from "./sendTokenToDashboard";

const DASHBOARD_URL = "http://localhost:3000";

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

        default: {
          sendResponse({ success: false, error: "Unknown message type" });
        }
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

  switch (msg.type) {
    case "PING":
      sendResponse({ pong: true });
      return true;

    case "SAVE_TOKEN":
      chrome.storage.sync.set({ token: msg.token }, () => {
        if (chrome.runtime.lastError) {
          sendResponse({
            success: false,
            error: chrome.runtime.lastError.message,
          });
        } else {
          sendResponse({ success: true });
        }
      });
      return true;

    case "DELETE_TOKEN":
      chrome.storage.sync.remove("token", () => {
        if (chrome.runtime.lastError) {
          sendResponse({
            success: false,
            error: chrome.runtime.lastError.message,
          });
        } else {
          sendResponse({ success: true });
        }
      });
      return true;

    case "UPDATE_BLOCKED_SITES":
      if (!Array.isArray(msg.blockedSites)) {
        sendResponse({ success: false, error: "Invalid blockedSites array" });
        return true;
      }

      chrome.storage.sync.set({ blockedSites: msg.blockedSites }, () => {
        if (chrome.runtime.lastError) {
          sendResponse({
            success: false,
            error: chrome.runtime.lastError.message,
          });
        } else {
          sendResponse({ success: true });
        }
      });
      return true;

    default:
      sendResponse({ success: false, error: "Unknown message type" });
      return true;
  }
});

function extractDomain(url: string): string | null {
  try {
    const { hostname } = new URL(url);
    return hostname.replace(/^www\./, "").toLowerCase();
  } catch {
    return null;
  }
}

function isBlocked(url: string, blockedSites: string[]): boolean {
  try {
    const { hostname } = new URL(url);
    const normalized = hostname.replace(/^www\./, "").toLowerCase();

    return blockedSites.some((blocked) => {
      const cleanBlocked = blocked.toLowerCase();
      return (
        normalized === cleanBlocked ||
        normalized.endsWith(`.${cleanBlocked}`) ||
        normalized.split(".")[0] === cleanBlocked
      );
    });
  } catch {
    return false;
  }
}

function handleBlockCheck(tabId: number, url?: string) {
  if (!url || url.startsWith(DASHBOARD_URL)) return;

  chrome.storage.sync.get("blockedSites", (data) => {
    const blockedSites = data.blockedSites || [];
    if (isBlocked(url, blockedSites)) {
      chrome.tabs.update(tabId, { url: DASHBOARD_URL });
    }
  });
}

chrome.tabs.onActivated.addListener(async (activeInfo) => {
  const tab = await chrome.tabs.get(activeInfo.tabId);
  handleBlockCheck(activeInfo.tabId, tab.url);
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === "complete" && tab.url) {
    handleBlockCheck(tabId, tab.url);
  }
});
