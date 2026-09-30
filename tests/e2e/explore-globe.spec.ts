import { test, expect } from "@playwright/test";

test.use({ viewport: { width: 1440, height: 900 } });

async function ready(page: import("@playwright/test").Page, url: string) {
  await page.goto(url);
  await expect(page.getByTestId("space-view")).toHaveAttribute("data-ready", "true");
}

test("the globe view shows the canon places and the scrubber steps time", async ({ page }) => {
  await ready(page, "/explore?space=globe");
  const globe = page.getByTestId("globe-view");
  await expect(globe.locator("canvas")).toBeVisible();
  const label = page.getByTestId("globe-year");
  await expect(label).toContainText("places");
  const all = Number(await globe.getAttribute("data-markers"));
  expect(all).toBeGreaterThan(100);
  await page.getByRole("slider", { name: "year" }).focus();
  await page.keyboard.press("Home");
  await expect.poll(async () => Number(await globe.getAttribute("data-markers"))).toBeLessThan(all);
  await page.keyboard.press("End");
  await expect.poll(async () => Number(await globe.getAttribute("data-markers"))).toBe(all);
});

test("scroll steps the year and never reaches the globe controls", async ({ page }) => {
  await ready(page, "/explore?space=globe");
  const canvas = page.locator('[data-testid="globe-view"] canvas');
  await expect(canvas).toBeVisible();
  await canvas.evaluate((el) => {
    (window as unknown as { __wheel: number }).__wheel = 0;
    el.addEventListener("wheel", () => ((window as unknown as { __wheel: number }).__wheel += 1));
  });
  const scrubber = page.getByTestId("scrubber");
  const before = Number(await scrubber.getAttribute("data-index"));
  const box = (await canvas.boundingBox())!;
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.wheel(0, -120);
  await expect(scrubber).toHaveAttribute("data-index", String(before - 1));
  await page.waitForTimeout(250);
  await page.mouse.wheel(0, 120);
  await expect(scrubber).toHaveAttribute("data-index", String(before));
  expect(await page.evaluate(() => (window as unknown as { __wheel: number }).__wheel)).toBe(0);
});

test("the earth view places the records of the current data set", async ({ page }) => {
  await ready(page, "/explore?space=earth");
  const globe = page.getByTestId("globe-view");
  await expect(globe.locator("canvas")).toBeVisible();
  const n = Number(await globe.getAttribute("data-markers"));
  expect(n).toBeGreaterThan(20);
  await expect(page.getByTestId("earth-empty")).toHaveCount(0);
});

test("a data set without places says so on the earth", async ({ page }) => {
  await ready(page, "/explore?space=earth&data=dna-sample");
  await expect(page.getByTestId("earth-empty")).toBeVisible();
});

test("switching views keeps the data set and the globe views sit in the view switch", async ({ page }) => {
  await ready(page, "/explore?view=circle");
  for (const v of ["globe", "earth"]) {
    await page.getByRole("radio", { name: v, exact: true }).click();
    await expect(page.getByTestId("globe-view")).toBeVisible();
    await expect(page).toHaveURL(new RegExp(`space=${v}`));
  }
  await expect(page.getByTestId("data-switcher")).toHaveValue("canon");
});
