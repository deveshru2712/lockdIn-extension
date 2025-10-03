import Overlay from "@/components/Overlay";
import { useState, useEffect } from "react";

export default function App() {
  const [status, setStatus] = useState("");
  const [currentUrl, setCurrentUrl] = useState("");
  // @ts-ignore
  const [blockedSites, setBlockedSites] = useState<string[]>([]);

  // Load current tab + blocklist
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
    chrome.runtime.sendMessage({ type: "ADD_SITE", url: currentUrl }, (res) => {
      if (res?.success) {
        setStatus("✅ Site blocked!");
        setBlockedSites((prev) => [...prev, currentUrl]);
      } else {
        setStatus("⚠️ Already blocked");
      }
    });
  };

  const handleUnblockSite = () => {
    if (!currentUrl) return;
    chrome.runtime.sendMessage(
      { type: "REMOVE_SITE", url: currentUrl },
      (res) => {
        if (res?.success) {
          setBlockedSites((prev) => prev.filter((s) => s !== currentUrl));
          setStatus("✅ Site unblocked!");
        }
      },
    );
  };

  return (
    <div className="aspect-square w-[310px]">
      {/* Dashed Grid */}
      <Overlay />

      {/* Content */}
      <div className="relative z-10 flex h-full w-full flex-col items-center justify-center gap-4 p-4">
        <h1 className="text-3xl font-bold">Ready to Lock In ?</h1>
        <p className="text-muted-foreground max-w-xs text-center text-sm">
          Block distracting websites and reclaim your focus.
        </p>

        {/* Block button */}
        <button
          type="button"
          onClick={handleBlockSite}
          className="bg-primary text-primary-foreground focus-visible:ring-ring inline-flex cursor-pointer items-center justify-center rounded-md px-4 py-2 text-sm font-medium shadow-sm hover:opacity-90 focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
          aria-label="Block this website"
          aria-describedby="block-desc"
        >
          Block this website
        </button>

        {/* NEW Unblock button */}
        <button
          type="button"
          onClick={handleUnblockSite}
          className="focus-visible:ring-ring inline-flex cursor-pointer items-center justify-center rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:opacity-90 focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
          aria-label="Unblock this website"
          aria-describedby="unblock-desc"
        >
          Unblock this website
        </button>

        <p
          id="block-desc"
          className="text-muted-foreground text-center text-xs"
        >
          Adds the current site to your blocked list.
        </p>
        <p
          id="unblock-desc"
          className="text-muted-foreground text-center text-xs"
        >
          Removes the current site from your blocked list.
        </p>

        {status && (
          <p className="text-center text-sm text-green-600 dark:text-green-400">
            {status}
          </p>
        )}
      </div>
    </div>
  );
}
