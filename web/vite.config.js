import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// BASE_PATH is set when building for GitHub Pages (/pistachio-loaf/).
// On Vercel or a custom domain it stays "/".
export default defineConfig({
  plugins: [react()],
  base: process.env.BASE_PATH || "/",
});
