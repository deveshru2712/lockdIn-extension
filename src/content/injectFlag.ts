const script = document.createElement("script");
script.src = chrome.runtime.getURL("flag.js");
(document.documentElement || document.head).appendChild(script);
