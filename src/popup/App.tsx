import Overlay from "@/components/Overlay";

export default function App() {
  return (
    <div className="relative aspect-square w-[320px] rounded-2xl border">
      {/* Dashed Grid */}
      <Overlay />
      {/* content */}
      <div className="relative z-10 flex h-full w-full flex-col items-center justify-center gap-4 p-4">
        <h1 className="text-3xl font-bold">Ready to Lock In ?</h1>
        {/* supportive subtitle for better visual hierarchy */}
        <p className="text-muted-foreground max-w-xs text-center text-sm">
          Block distracting websites and reclaim your focus.
        </p>
        {/* button with aria-describedby for accessibility */}
        <button
          type="button"
          className="bg-primary text-primary-foreground focus-visible:ring-ring inline-flex items-center justify-center rounded-md px-4 py-2 text-sm font-medium shadow-sm hover:opacity-90 focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
          aria-label="Block this website"
          aria-describedby="block-desc"
        >
          Block this website
        </button>
        <p
          id="block-desc"
          className="text-muted-foreground text-center text-xs"
        >
          Adds the current site to your blocked list.
        </p>
      </div>
    </div>
  );
}
