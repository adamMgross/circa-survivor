import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  // GitHub Pages serves the site under /circa-survivor/
  base: process.env.GITHUB_PAGES ? "/circa-survivor/" : "/",
  plugins: [react()],
});
