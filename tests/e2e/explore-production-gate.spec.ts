import { test, expect } from "@playwright/test";

test.use({ viewport: { width: 1440, height: 900 } });
test.skip(process.env.E2E_SAMPLE_GATE !== "production", "needs a server started with VERCEL_ENV=production");

async function ready(page: import("@playwright/test").Page, url: string) {
  await page.goto(url);
  await expect(page.getByTestId("space-view")).toHaveAttribute("data-ready", "true");
}

test("the production switcher has no sample advisors option", async ({ page }) => {
  await ready(page, "/explore?view=circle");
  const sw = page.getByTestId("data-switcher");
  await expect(sw).toHaveValue("canon");
  await expect(sw.locator("option", { hasText: "sample advisors" })).toHaveCount(0);
  await expect(sw.locator('option[value="sample"]')).toHaveCount(0);
});

test("the sample data param falls back to canon in production", async ({ page }) => {
  await ready(page, "/explore?view=circle&data=sample");
  await expect(page.getByTestId("data-switcher")).toHaveValue("canon");
  await expect(page.getByTestId("sample-badge")).toHaveCount(0);
});

test("production search returns no sample advisor", async ({ page, request }) => {
  const body = await (await request.get("/api/explore/search?q=quantum%20photon%20entropy&top_k=60")).json();
  expect(body.advisors_sample).toBe(false);
  expect(body.advisors_source).not.toBe("sample");
  expect(body.results.filter((r: { title: string }) => /^Sample Advisor/.test(r.title))).toHaveLength(0);
  const map = await (await request.get("/api/explore/search?map=1")).json();
  expect(map.advisors_sample).toBe(false);
  expect(map.advisors.filter((a: { name: string }) => /^Sample Advisor/.test(a.name))).toHaveLength(0);
  await page.goto("/explore");
  await expect(page.getByTestId("advisor-source")).not.toHaveText("source: sample");
  await expect(page.getByTestId("explore-results").locator("li").first()).toBeVisible();
  await expect(page.getByText(/Sample Advisor/)).toHaveCount(0);
});
