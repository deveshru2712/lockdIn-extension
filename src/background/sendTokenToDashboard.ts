type SendTokenResponse = {
  success: boolean;
  mode?: "online" | "guest" | "expired";
  error?: unknown;
};

const DASHBOARD_URL = "http://localhost:3000";

export async function sendTokenToDashboard(
  data: Record<string, any>,
): Promise<SendTokenResponse> {
  try {
    const { token } = await chrome.storage.sync.get("token");

    // Guest mode
    if (!token) {
      console.warn("🕓 Guest mode: no token found, skipping backend call.");
      await handleLocalBlock(data);
      return { success: true, mode: "guest" };
    }

    console.log("📤 Sending token to dashboard...");
    const response = await fetch(`${DASHBOARD_URL}/api/extension`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    });

    //  Token expired
    if (response.status === 401) {
      console.warn("⚠️ Token expired or invalid. Removing token...");
      await chrome.storage.sync.remove("token");
      await openDashboardForLogin();
      return { success: false, mode: "expired" };
    }

    const result = await response.json();
    console.log("✅ Dashboard response:", result);

    return { success: true, mode: "online", ...result };
  } catch (error) {
    console.error("❌ Error sending token to dashboard:", error);
    return { success: false, error };
  }
}

async function handleLocalBlock(data: { url?: string; site?: string }) {
  const { blockedSites = [] } = await chrome.storage.sync.get("blockedSites");
  const site = data.url || data.site;
  if (!site) return;

  if (!blockedSites.includes(site)) {
    blockedSites.push(site);
    await chrome.storage.sync.set({ blockedSites });
    console.log("✅ Site locally blocked (guest mode):", site);
  }
}

async function openDashboardForLogin() {
  const tabs = await chrome.tabs.query({ url: `${DASHBOARD_URL}/*` });

  if (tabs.length > 0) {
    await chrome.tabs.update(tabs[0].id, { active: true });
  } else {
    await chrome.tabs.create({ url: `${DASHBOARD_URL}/login` });
  }
}
