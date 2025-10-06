import Overlay from "@/components/Overlay";
import { useState, useEffect } from "react";

export default function App() {
  const [status, setStatus] = useState("");
  const [currentUrl, setCurrentUrl] = useState("");
  const [blockedSites, setBlockedSites] = useState<string[]>([]);
  const DASHBOARD_URL = "http://localhost:3000";

  useEffect(() => {
    chrome.runtime.sendMessage({ type: "GET_CURRENT_TAB" }, (response) => {
      if (response?.url) setCurrentUrl(response.url);
    });

    chrome.storage.sync.get("blockedSites", (data) => {
      setBlockedSites(data.blockedSites || []);
    });
  }, []);

  const handleBlockSite = () => {
    if (!currentUrl) return;

    if (currentUrl.startsWith(DASHBOARD_URL)) {
      setStatus("⚠️ You cannot block the dashboard itself.");
      return;
    }

    chrome.runtime.sendMessage(
      { type: "ADD_SITE", site: currentUrl },
      (res) => {
        if (!res) return setStatus("⚠️ No response from background script.");

        if (res.success) {
          setStatus("✅ Site blocked successfully!");
          setBlockedSites((prev) => [...new Set([...prev, currentUrl])]);
        } else if (res.mode === "guest") {
          setStatus("⚙️ Site blocked locally (guest mode).");
        } else if (res.mode === "expired") {
          setStatus("🔑 Session expired. Please log in again.");
        } else {
          setStatus("⚠️ Something went wrong. Try again.");
        }
      },
    );
  };

  const handleOpenBlockList = async () => {
    const DASHBOARD_URL = "http://localhost:3000/";
    const tabs = await chrome.tabs.query({ url: `${DASHBOARD_URL}*` });
    if (tabs.length > 0) {
      await chrome.tabs.update(tabs[0].id!, { active: true });
    } else {
      await chrome.tabs.create({ url: DASHBOARD_URL });
    }
    window.close();
  };

  return (
    <div className="bg-background text-foreground h-[380px] w-[310px] overflow-hidden">
      <Overlay />
      <div className="relative z-10 flex h-full flex-col items-center justify-center gap-4 p-4">
        <h1 className="text-3xl font-bold">Ready to Lock In?</h1>
        <p className="text-muted-foreground max-w-xs text-center text-sm">
          Block distracting websites and reclaim your focus.
        </p>

        <button
          onClick={handleBlockSite}
          className="bg-primary text-primary-foreground inline-flex items-center justify-center rounded-md px-4 py-2 text-sm font-medium shadow-sm hover:opacity-90"
        >
          Block this website
        </button>

        <p className="text-muted-foreground text-center text-xs">
          Manage your{" "}
          <span
            onClick={handleOpenBlockList}
            className="text-primary cursor-pointer underline"
          >
            blocked websites
          </span>{" "}
          in the dashboard.
        </p>

        <div className="mt-2 h-5 text-center text-sm">
          {status && (
            <p
              className={`${
                status.startsWith("✅")
                  ? "text-green-600 dark:text-green-400"
                  : status.startsWith("🔑")
                    ? "text-yellow-600 dark:text-yellow-400"
                    : "text-red-500 dark:text-red-400"
              }`}
            >
              {status}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
