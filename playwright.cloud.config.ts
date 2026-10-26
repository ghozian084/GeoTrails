import { defineConfig, devices } from "@playwright/test";

/*
 * Class features of GeoTrails Peta against the local Firebase emulators.
 * Run with `npm run e2e:cloud` (starts the emulators, builds with .env.emulator).
 */
const PORT = 4180;

export default defineConfig({
  testDir: "e2e/cloud",
  workers: 1,
  reporter: [["list"]],
  use: { ...devices["Desktop Chrome"], baseURL: `http://localhost:${PORT}`, viewport: { width: 1280, height: 860 }, trace: "retain-on-failure" },
  webServer: {
    command: `npx vite build --mode emulator --outDir dist-emulator && npx vite preview --outDir dist-emulator --port ${PORT} --strictPort`,
    url: `http://localhost:${PORT}/peta/`,
    reuseExistingServer: false,
    timeout: 120_000,
  },
});
