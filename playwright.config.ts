import { defineConfig, devices } from "@playwright/test";

/*
 * End-to-end tests run against the production build (vite preview), so they also
 * check that nothing is loaded from the network at runtime.
 * First time on a new machine: `npx playwright install chromium`.
 */
const PORT = 4173;

export default defineConfig({
  testDir: "e2e",
  fullyParallel: true,
  reporter: [["list"]],
  use: {
    baseURL: `http://localhost:${PORT}`,
    viewport: { width: 1280, height: 860 },
    trace: "retain-on-failure",
  },
  projects: [
    {
      name: "chromium",
      testIgnore: /blox\.spec\.ts/,
      use: { ...devices["Desktop Chrome"], viewport: { width: 1280, height: 860 } },
    },
    {
      // The 3D page needs WebGL; software rendering lets it run without a GPU (containers, CI).
      // Kept separate because these flags slow down the 2D pages.
      name: "blox",
      testMatch: /blox\.spec\.ts/,
      fullyParallel: false,
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 1280, height: 860 },
        launchOptions: { args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader"] },
      },
    },
  ],
  webServer: {
    command: `npm run build && npx vite preview --port ${PORT} --strictPort`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: false,
    timeout: 120_000,
  },
});
