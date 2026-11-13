import { defineConfig } from "@playwright/test";

const PORT = Number(process.env.PL_LIVE_PORT ?? 3108);

export default defineConfig({
  testDir: "e2e",
  testMatch: /live(-layout)?\.spec\.ts/,
  timeout: 300_000,
  workers: 1,
  use: { baseURL: process.env.PL_LIVE_BASE_URL || `http://localhost:${PORT}` },
  projects: [
    { name: "chromium", use: { browserName: "chromium" } },
    { name: "webkit", use: { browserName: "webkit" }, testMatch: /live-layout\.spec\.ts/ },
  ],
  webServer: process.env.PL_LIVE_BASE_URL ? undefined : { command: `npx next build && npx next start -p ${PORT}`, url: `http://localhost:${PORT}/join`, reuseExistingServer: false, timeout: 420_000 },
});
