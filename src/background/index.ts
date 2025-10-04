chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  console.log("📩 Internal message received:", msg, "from", sender);

  if (msg.type === "PING") {
    sendResponse({ pong: true });
    return true;
  }

  if (msg.type === "SAVE_TOKEN") {
    chrome.storage.sync.set({ token: msg.token }, () => {
      if (chrome.runtime.lastError) {
        console.error("❌ Failed to save token:", chrome.runtime.lastError);
        sendResponse({
          success: false,
          error: chrome.runtime.lastError.message,
        });
      } else {
        console.log("✅ Token saved (internal)");
        sendResponse({ success: true });
      }
    });
    return true;
  }

  //  adding a site
  if (msg.type === "ADD_SITE") {
    chrome.storage.sync.get(["blockedSites"], (data) => {
      const blockedSites = data.blockedSites || [];
      if (!blockedSites.includes(msg.site)) blockedSites.push(msg.site);
      chrome.storage.sync.set({ blockedSites }, () => {
        console.log("✅ Site added to blocklist:", msg.site);
        sendResponse({ success: true });
      });
    });
    return true;
  }

  return true;
});

// Listening for external messages
chrome.runtime.onMessageExternal.addListener((msg, sender, sendResponse) => {
  console.log("🌐 External message received:", msg, "from", sender.origin);

  // Safety: only allow from localhost during dev
  const allowedOrigins = ["http://localhost:3000", "http://127.0.0.1:3000"];
  if (!allowedOrigins.includes(sender.origin || "")) {
    console.warn("🚫 Unauthorized external message from:", sender.origin);
    sendResponse({ success: false, error: "Origin not allowed" });
    return true;
  }

  if (msg.type === "PING") {
    console.log("🔁 PING from external dashboard");
    sendResponse({ pong: true });
    return true;
  }

  if (msg.type === "SAVE_TOKEN") {
    chrome.storage.sync.set({ token: msg.token }, () => {
      if (chrome.runtime.lastError) {
        console.error(
          "❌ Failed to save token (external):",
          chrome.runtime.lastError,
        );
        sendResponse({
          success: false,
          error: chrome.runtime.lastError.message,
        });
      } else {
        console.log("✅ Token saved from external dashboard");
        sendResponse({ success: true });
      }
    });
    return true;
  }

  return true;
});
