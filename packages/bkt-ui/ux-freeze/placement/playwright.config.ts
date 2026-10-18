import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: ".",
  snapshotPathTemplate: "{testDir}/../snapshots/{arg}{ext}",
  timeout: 120_000,
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [["list"]],
  expect: { timeout: 20_000, toHaveScreenshot: { maxDiffPixels: 0, threshold: 0, animations: "disabled", caret: "hide" } },
  use: {
    baseURL: process.env.UX_FREEZE_SITE_URL ?? "http://127.0.0.1:3100",
    viewport: { width: 1280, height: 860 },
    deviceScaleFactor: 1,
    locale: "en-US",
    timezoneId: "UTC",
    colorScheme: "light",
    reducedMotion: "reduce",
  },
});
