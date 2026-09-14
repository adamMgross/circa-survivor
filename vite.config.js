import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

// Dev proxy so the Refresh button works locally: the component calls https://api.anthropic.com/v1/messages;
// src/main.jsx rewrites that to /anthropic/... and this proxy adds your API key server-side.
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  return {
    plugins: [react()],
    server: {
      proxy: {
        "/anthropic": {
          target: "https://api.anthropic.com",
          changeOrigin: true,
          rewrite: (p) => p.replace(/^\/anthropic/, ""),
          headers: { "x-api-key": env.ANTHROPIC_API_KEY || "", "anthropic-version": "2023-06-01" },
        },
      },
    },
  };
});
