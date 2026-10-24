/// <reference types="vitest/config" />
import { defineConfig } from "vite";
import { viteSingleFile } from "vite-plugin-singlefile";

// `vite build` builds the 2D app and the 3D Blox prototype (blox/ → /blox/).
// `vite build --mode single` produces one self-contained offline HTML file of the 2D app.
export default defineConfig(({ mode }) => ({
  base: "./",
  plugins: mode === "single" ? [viteSingleFile()] : [],
  build: {
    outDir: mode === "single" ? "dist-single" : "dist",
    // three.js alone is ~590 kB; it is only loaded by the Blox page.
    chunkSizeWarningLimit: 700,
    rollupOptions: { input: (mode === "single" ? { main: "index.html" } : { main: "index.html", blox: "blox/index.html" }) as Record<string, string> },
  },
  test: {
    include: ["tests/**/*.test.ts"],
    environment: "node",
  },
}));
