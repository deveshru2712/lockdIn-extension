import { defineManifest } from "@crxjs/vite-plugin";
import pkg from "./package.json";

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

  host_permissions: ["<all_urls>"],

  background: {
    service_worker: "src/background/index.ts",
    type: "module",
  },

  content_scripts: [
    {
      js: ["src/content/injectFlag.ts"],
      matches: ["http://localhost:3000/*"],
      run_at: "document_start",
    },
    {
      js: ["src/content/main.tsx"],
      matches: ["https://*/*", "http://*/*"],
      run_at: "document_idle",
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

  declarative_net_request: {
    rule_resources: [],
  },
});
