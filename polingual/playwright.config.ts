import { defineConfig } from "@playwright/test";

const PORT = Number(process.env.PL_E2E_PORT ?? 3107);

export default defineConfig({
  testDir: "e2e",
  timeout: 90_000,
  use: { baseURL: `http://localhost:${PORT}` },
  webServer: { command: `npx next dev -p ${PORT}`, url: `http://localhost:${PORT}/app`, reuseExistingServer: true, timeout: 180_000 },
});
