/// <reference types="vitest/config" />
import { createHash } from "node:crypto";
import { readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { defineConfig, type Plugin } from "vite";
import { viteSingleFile } from "vite-plugin-singlefile";

// `vite build` builds the student pages (/ and /3d), the teacher portal (/guru) and the classic
// version (/klasik/ and /klasik/3d). Page scripts live in src/pages/.
// `vite build --mode single` produces one self-contained offline HTML file of the classic 2D version.
/** Every file in a folder, as paths relative to it. */
const filesIn = (dir: string): string[] =>
  readdirSync(dir, { withFileTypes: true }).flatMap((d) => d.isDirectory() ? filesIn(join(dir, d.name)).map((f) => `${d.name}/${f}`) : [d.name]);

/**
 * Writes offline-files.json: every file of the built site (pages, assets, public files), for the
 * service worker's "Unduh untuk offline". The version changes whenever any file changes.
 */
function offlineFiles(): Plugin {
  return {
    name: "geotrails-offline-files",
    apply: "build",
    enforce: "post",
    generateBundle(_, bundle) {
      const pub = filesIn("public").filter((f) => !/(^|\/)\.|^sw\.js$/.test(f));
      const files = [...Object.keys(bundle), ...pub].filter((f) => f !== "offline-files.json").sort();
      const h = createHash("sha256");
      for (const [name, out] of Object.entries(bundle)) h.update(name).update(out.type === "chunk" ? out.code : String(out.source.length));
      for (const f of pub) h.update(f).update(String(statSync(join("public", f)).size));
      this.emitFile({ type: "asset", fileName: "offline-files.json", source: JSON.stringify({ version: h.digest("hex").slice(0, 12), files }) });
    },
  };
}

export default defineConfig(({ mode }) => ({
  base: "./",
  plugins: mode === "single" ? [viteSingleFile()] : [offlineFiles()],
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
