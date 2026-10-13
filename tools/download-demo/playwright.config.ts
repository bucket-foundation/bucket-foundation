import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "../../tests/e2e",
  testMatch: /download-(flow|demo|recorder)\.spec\.ts/,
  timeout: 60000,
  expect: { timeout: 10000 },
  workers: 1,
  reporter: "list",
  use: { baseURL: process.env.E2E_BASE_URL || "http://localhost:3187", headless: true, trace: "retain-on-failure" },
});
