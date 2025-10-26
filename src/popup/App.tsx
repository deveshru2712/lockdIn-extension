import Overlay from "@/components/Overlay";

export default function App() {
  const handleOpenBlockList = async () => {
    const DASHBOARD_URL = "https://www.lockdin.in/";
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
      </div>
    </div>
  );
}
