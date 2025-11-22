const DASHBOARD_URL = [
  "https://www.lockdin.in",
  //  "http://localhost:3000"
];

// Automatically choose correct dashboard URL
function getDashboardUrl() {
  const isLocal = window.location.hostname.includes("localhost");
  return isLocal ? DASHBOARD_URL[1] : DASHBOARD_URL[0];
}

async function checkAndRedirect() {
  try {
    const { blockedSites = [] } = await chrome.storage.sync.get("blockedSites");
    const { sessionBlockedSites = [] } = await chrome.storage.sync.get(
      "sessionBlockedSites",
    );

    const allSites = [...new Set([...blockedSites, ...sessionBlockedSites])];
    const currentHost = window.location.hostname
      .replace("www.", "")
      .toLowerCase();

    const isBlocked = allSites.some((site) => {
      let sitePattern = site.trim().toLowerCase().replace("www.", "");

      // Allow "instagram" to match as "instagram.com"
      if (!sitePattern.includes(".")) sitePattern = `${sitePattern}.com`;

      return (
        currentHost === sitePattern || currentHost.endsWith(`.${sitePattern}`)
      );
    });

    if (isBlocked) {
      const redirectUrl = `${getDashboardUrl()}/blocked?from=${encodeURIComponent(
        currentHost,
      )}`;
      window.location.replace(redirectUrl);
    }
  } catch (err) {
    console.error("Block check failed:", err);
  }
}

// Initial check
checkAndRedirect();

// Patch history for SPA sites
const originalPushState = history.pushState;
history.pushState = function (...args) {
  originalPushState.apply(this, args);
  checkAndRedirect();
};

const originalReplaceState = history.replaceState;
history.replaceState = function (...args) {
  originalReplaceState.apply(this, args);
  checkAndRedirect();
};

window.addEventListener("popstate", checkAndRedirect);
