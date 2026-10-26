import { defineConfig } from "vitest/config";

// Security-rules tests; they need the Firebase emulators (see `npm run test:rules`).
export default defineConfig({
  test: { include: ["firebase/**/*.test.ts"], environment: "node", testTimeout: 20_000, fileParallelism: false },
});
