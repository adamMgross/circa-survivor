import React from "react";
import { createRoot } from "react-dom/client";
import App from "./CircaSurvivorPlanner.jsx";

// --- window.storage shim (claude.ai artifacts provide this; locally we back it with localStorage) ---
window.storage = {
  get: async (key) => { const v = localStorage.getItem(key); if (v == null) throw new Error("not found"); return { key, value: v }; },
  set: async (key, value) => { localStorage.setItem(key, value); return { key, value }; },
  delete: async (key) => { localStorage.removeItem(key); return { key, deleted: true }; },
  list: async (prefix = "") => ({ keys: Object.keys(localStorage).filter((k) => k.startsWith(prefix)) }),
};

// --- route Anthropic API calls through the Vite dev proxy (adds the API key) ---
const realFetch = window.fetch.bind(window);
window.fetch = (url, opts) => {
  if (typeof url === "string" && url.startsWith("https://api.anthropic.com/")) url = url.replace("https://api.anthropic.com", "/anthropic");
  return realFetch(url, opts);
};

createRoot(document.getElementById("root")).render(<App />);
