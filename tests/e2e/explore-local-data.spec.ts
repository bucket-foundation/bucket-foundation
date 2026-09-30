import { test, expect } from "@playwright/test";

test.use({ viewport: { width: 1440, height: 900 } });

test.describe("local data sets from the guarded API", () => {
  test.skip(process.env.E2E_LOCAL_SPACE !== "1", "set E2E_LOCAL_SPACE=1 with BUCKET_LOCAL_SPACE=1 on a dev server that has .data/explore files");

  test("the switcher lists the real advisors and the published corpora", async ({ page }) => {
    await page.goto("/explore?view=circle");
    await expect(page.getByTestId("space-view")).toHaveAttribute("data-ready", "true");
    const sw = page.getByTestId("data-switcher");
    await expect(sw.locator('option[value="advisors"]')).toHaveCount(1);
    const values = await sw.locator("option").evaluateAll((os) => os.map((o) => (o as HTMLOptionElement).value));
    expect(values).toContain("advisors");
    expect(values).not.toContain("kruse");
    expect(values).not.toContain("health-longevity");
  });

  test("picking the advisors swaps the data and shows coverage, without emails", async ({ page }) => {
    await page.goto("/explore?view=circle");
    await expect(page.getByTestId("space-view")).toHaveAttribute("data-ready", "true");
    const canon = Number(await page.getByTestId("scrubber").getAttribute("data-count"));
    await page.getByTestId("data-switcher").selectOption("advisors");
    await expect(page).toHaveURL(/data=advisors/);
    await expect(page.getByTestId("scrubber")).not.toHaveAttribute("data-count", String(canon));
    expect(Number(await page.getByTestId("scrubber").getAttribute("data-count"))).toBeGreaterThan(1000);
    await expect(page.getByTestId("coverage-stat")).toContainText("mean coverage");
    await expect(page.getByTestId("basis-label")).toHaveCount(0);
    const text = await page.locator("body").innerText();
    expect(text).not.toMatch(/[\w.+-]+@[\w-]+\.[\w.]+/);
  });

  test("a data param opens the advisors directly and the view is kept", async ({ page }) => {
    await page.goto("/explore?space=sphere&data=advisors");
    await expect(page.getByTestId("data-switcher")).toHaveValue("advisors");
    await expect(page.getByTestId("surface-view")).toHaveAttribute("data-mode", "sphere");
  });

  test("the API answers 200 for a listed set and 404 for private and traversal ids", async ({ request }) => {
    expect((await request.get("/api/explore/space?id=advisors")).status()).toBe(200);
    expect((await request.get("/api/explore/space?id=kruse")).status()).toBe(404);
    expect((await request.get("/api/explore/space?id=..%2Fadvisors")).status()).toBe(404);
    const list = (await (await request.get("/api/explore/space")).json()) as { datasets: { id: string }[] };
    expect(list.datasets.map((d) => d.id)).toContain("advisors");
  });
});
