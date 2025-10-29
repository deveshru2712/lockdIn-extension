const DASHBOARD_URL = "https://www.lockdin.in";

async function checkAndRedirect() {
  try {
    const { blockedSites = [] } = await chrome.storage.sync.get("blockedSites");
    const { sessionBlockedSites = [] } = await chrome.storage.sync.get(
      "sessionBlockedSites",
    );

    const allSites = [...new Set([...blockedSites, ...sessionBlockedSites])];
    const currentHost = window.location.hostname.replace("www.", "");

    const isBlocked = allSites.some((site) => {
      let sitePattern = site.trim().toLowerCase().replace("www.", "");
      if (!sitePattern.includes(".")) sitePattern = `${sitePattern}.com`;
      return (
        currentHost === sitePattern || currentHost.endsWith(`.${sitePattern}`)
      );
    });

    if (isBlocked) {
      const redirectUrl = `${DASHBOARD_URL}/blocked?from=${encodeURIComponent(currentHost)}`;
      window.location.replace(redirectUrl);
    }
  } catch (err) {
    console.error("Block check failed:", err);
  }
}

// Check on load
checkAndRedirect();

// Check on history changes (for SPA navigation)
const originalPushState = history.pushState;
const originalReplaceState = history.replaceState;

history.pushState = function (...args) {
  originalPushState.apply(this, args);
  checkAndRedirect();
};

history.replaceState = function (...args) {
  originalReplaceState.apply(this, args);
  checkAndRedirect();
};

// Also listen for popstate (back/forward buttons)
window.addEventListener("popstate", checkAndRedirect);
