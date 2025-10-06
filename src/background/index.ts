import { sendTokenToDashboard } from "./sendTokenToDashboard";

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
          console.warn("⚠️ Unknown internal message type:", message?.type);
          sendResponse({ success: false, error: "Unknown message type" });
        }
      }
    } catch (err) {
      console.error("❌ Background internal handler error:", err);
      sendResponse({ success: false, error: String(err) });
    }
  })();

  return true;
});

chrome.runtime.onMessageExternal.addListener((msg, sender, sendResponse) => {
  const allowedOrigins = ["http://localhost:3000", "http://127.0.0.1:3000"];
  if (!allowedOrigins.includes(sender.origin || "")) {
    console.warn("🚫 Unauthorized external message from:", sender.origin);
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
          console.log("✅ Token saved from dashboard");
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
          console.log("🗑️ Token deleted successfully");
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
          console.log("🚫 Blocked sites updated:", msg.blockedSites);
          sendResponse({ success: true });
        }
      });
      return true;

    default:
      sendResponse({ success: false, error: "Unknown message type" });
      return true;
  }
});

const DASHBOARD_URL = "http://localhost:3000";

function extractDomain(url: string): string | null {
  try {
    const { hostname } = new URL(url);
    const parts = hostname.split(".");
    return parts.length > 2 ? parts.slice(-2).join(".") : hostname;
  } catch {
    return null;
  }
}

// blocker function
function isBlocked(url: string, blockedSites: string[]): boolean {
  const domain = extractDomain(url);
  if (!domain) return false;
  return blockedSites.some(
    (blocked) => domain === blocked || domain.endsWith(blocked),
  );
}

function handleBlockCheck(tabId: number, url?: string) {
  if (!url || url.startsWith(DASHBOARD_URL)) return;

  chrome.storage.sync.get("blockedSites", (data) => {
    const blockedSites = data.blockedSites || [];
    if (isBlocked(url, blockedSites)) {
      console.log("🚫 Blocking domain:", extractDomain(url));
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
