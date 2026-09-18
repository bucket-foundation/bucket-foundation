import { defineConfig } from "@playwright/test";

// End-to-end flows over the local stack: the dev server on :3100 and the
// local Supabase (npm run db:local) with its mail catcher on :54324.
// Run: npm run e2e. CI skips these unless E2E=1 with the stack available.
export default defineConfig({
  testDir: "tests/e2e",
  timeout: 120_000,
  expect: { timeout: 20_000 },
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [["list"]],
  use: {
    baseURL: process.env.E2E_BASE_URL || "http://localhost:3100",
    headless: true,
    trace: "retain-on-failure",
    launchOptions: process.env.E2E_CHROME ? { executablePath: process.env.E2E_CHROME } : undefined,
  },
});
