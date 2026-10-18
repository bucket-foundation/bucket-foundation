import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: ".",
  testMatch: "polingual.spec.ts",
  globalSetup: "./global-setup.ts",
  snapshotPathTemplate: "{testDir}/snapshots/{arg}{ext}",
  timeout: 60_000,
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [["list"]],
  expect: { toHaveScreenshot: { maxDiffPixels: 0, threshold: 0, animations: "disabled", caret: "hide" } },
  use: {
    baseURL: process.env.UX_FREEZE_URL,
    viewport: { width: 1280, height: 860 },
    deviceScaleFactor: 1,
    locale: "en-US",
    timezoneId: "UTC",
    colorScheme: "light",
    reducedMotion: "reduce",
  },
});
