import { defineManifest } from "@crxjs/vite-plugin";
import pkg from "./package.json";

export default defineManifest({
  manifest_version: 3,
  name: pkg.name,
  version: pkg.version,
  icons: {
    48: "logo.png",
  },
  action: {
    default_icon: {
      48: "logo.png",
    },
    default_popup: "src/popup/index.html",
  },
  permissions: ["tabs", "storage", "webRequest"],
  background: {
    service_worker: "src/background/index.ts",
    type: "module",
  },
  content_scripts: [
    {
      js: ["src/content/injectFlag.ts"],
      matches: [
        "http://localhost:3000/*", // dev dashboard
      ],
      run_at: "document_start",
    },
    {
      js: ["src/content/main.tsx"], // main blocker logic
      matches: ["https://*/*"],
    },
  ],
  externally_connectable: {
    matches: ["http://localhost:3000/*", "http://127.0.0.1:3000/*"],
  },
  web_accessible_resources: [
    {
      resources: ["flag.js"],
      matches: ["<all_urls>"],
    },
  ],
});
