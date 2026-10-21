import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: ".",
  testMatch: "brand.spec.ts",
  globalSetup: "../ux-freeze/global-setup.ts",
  snapshotPathTemplate: "{testDir}/snapshots/{arg}{ext}",
  timeout: 120_000,
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [["list"]],
  expect: { toHaveScreenshot: { maxDiffPixels: 0, threshold: 0, animations: "disabled", caret: "hide" } },
  use: {
    baseURL: process.env.UX_FREEZE_URL,
    deviceScaleFactor: 1,
    locale: "en-US",
    timezoneId: "UTC",
    reducedMotion: "reduce",
    launchOptions: { args: ["--disable-skia-runtime-opts", "--disable-gpu", "--disable-partial-raster", "--disable-lcd-text", "--font-render-hinting=none", "--force-color-profile=srgb", "--force-device-scale-factor=1"] },
  },
});
