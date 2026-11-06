import { defineConfig } from "@playwright/test";

const PORT = Number(process.env.PL_LIVE_PORT ?? 3108);

export default defineConfig({
  testDir: "e2e",
  testMatch: /live\.spec\.ts/,
  timeout: 300_000,
  workers: 1,
  use: { baseURL: `http://localhost:${PORT}` },
  webServer: { command: `npx next build && npx next start -p ${PORT}`, url: `http://localhost:${PORT}/join`, reuseExistingServer: false, timeout: 420_000 },
});
