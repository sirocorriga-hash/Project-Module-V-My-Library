import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

// In development Vite serves the UI on :5173 and forwards /api to Flask on :5000.
// `npm run build` writes to dist/, which Flask serves in production.
export default defineConfig({
  plugins: [react()],
  server: { proxy: { "/api": "http://127.0.0.1:5000" } },
  build: { outDir: "dist", emptyOutDir: true },
  test: { environment: "jsdom", globals: true, setupFiles: "./src/test-setup.ts" }
});
