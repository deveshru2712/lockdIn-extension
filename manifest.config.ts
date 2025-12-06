import { defineManifest } from "@crxjs/vite-plugin";
import pkg from "./package.json";

const DASHBOARD_URLS = [
  // Local development (uncomment when needed)
  // "http://localhost:3000/*",
  // "http://127.0.0.1:3000/*",

  // Production domains
  "https://lockdin.in/*",
  "https://www.lockdin.in/*",
];

export default defineManifest({
  manifest_version: 3,
  name: pkg.name,
  description: "Block distracting websites and stay productive.",
  version: pkg.version,

  icons: {
    48: "logo.png",
    128: "logo.png",
  },

  action: {
    default_icon: {
      48: "logo.png",
    },
    default_popup: "src/popup/index.html",
  },

  permissions: [
    "storage",
    "tabs",
    "declarativeNetRequest",
    "declarativeNetRequestWithHostAccess",
  ],

  host_permissions: ["https://lockdin.in/*", "https://www.lockdin.in/*"],

  background: {
    service_worker: "src/background/index.ts",
    type: "module",
  },

  content_scripts: [
    {
      js: ["src/content/injectFlag.ts"],
      matches: DASHBOARD_URLS,
      run_at: "document_start",
      all_frames: true,
    },
    {
      js: ["src/content/blockPage.ts"],
      matches: ["<all_urls>"],
      run_at: "document_start",
      all_frames: false,
    },
  ],

  externally_connectable: {
    matches: ["https://lockdin.in/*", "https://www.lockdin.in/*"],
  },

  web_accessible_resources: [
    {
      resources: ["flag.js"],
      matches: ["<all_urls>"],
    },
  ],
});
