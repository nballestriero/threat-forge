import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

/**
 * @file Vite configuration for the MR-0002 Governance Console frontend slice.
 *
 * The configuration keeps frontend source under `frontend/` and writes built
 * validation assets under `artifacts/frontend/`, preserving the repository rule
 * that generated previews are not canonical project-model sources.
 */
export default defineConfig({
  root: "frontend",
  plugins: [react()],
  build: {
    outDir: "../artifacts/frontend/governance-console",
    emptyOutDir: true,
  },
  server: {
    host: "127.0.0.1",
    port: 5173,
  },
});
