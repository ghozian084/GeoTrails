/// <reference types="vitest/config" />
import { defineConfig } from "vite";
import { viteSingleFile } from "vite-plugin-singlefile";

// `vite build` builds the student pages (/ and /3d), the teacher portal (/guru) and the classic
// version (/klasik/ and /klasik/3d). Page scripts live in src/pages/.
// `vite build --mode single` produces one self-contained offline HTML file of the classic 2D version.
export default defineConfig(({ mode }) => ({
  base: "./",
  plugins: mode === "single" ? [viteSingleFile()] : [],
  build: {
    outDir: mode === "single" ? "dist-single" : "dist",
    // three.js alone is ~590 kB; it is only loaded by the 3D pages.
    chunkSizeWarningLimit: 700,
    rollupOptions: { input: (mode === "single" ? { klasik: "klasik/index.html" } : { siswa2d: "index.html", siswa3d: "3d.html", guru: "guru.html", klasik2d: "klasik/index.html", klasik3d: "klasik/3d.html" }) as Record<string, string> },
  },
  test: {
    include: ["tests/**/*.test.ts"],
    environment: "node",
  },
}));
