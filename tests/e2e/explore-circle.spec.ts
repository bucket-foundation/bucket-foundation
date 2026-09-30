import { test, expect } from "@playwright/test";

test.use({ viewport: { width: 1440, height: 900 } });

test("the circle view renders the chart on the canon data", async ({ page }) => {
  await page.goto("/explore?view=circle");
  await expect(page.getByTestId("space-view")).toBeVisible();
  await expect(page.getByTestId("sample-badge")).toHaveCount(0);
  await expect(page.getByTestId("coverage-stat")).toContainText("mean coverage");
  await expect(page.getByTestId("basis-label")).toHaveCount(0);
  const chart = page.getByTestId("circle-chart");
  await expect(chart).toBeVisible();
  await expect(chart.locator("g[data-series=mean]")).toHaveAttribute("data-vertices", "12");
  await expect(chart.locator("g[data-vertices]")).toHaveCount(2);
});

test("scrolling steps through the observations", async ({ page }) => {
  await page.goto("/explore?view=circle");
  const current = page.getByTestId("space-current");
  await expect(current).toContainText("1 /");
  const box = (await page.getByTestId("circle-chart").boundingBox())!;
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.wheel(0, 120);
  await expect(current).toContainText("2 /");
  await page.mouse.wheel(0, -120);
  await expect(current).toContainText("1 /");
});

test("a click on an observation selects it", async ({ page }) => {
  await page.goto("/explore?view=circle");
  const third = page.locator("ul >> li >> button[aria-pressed]").nth(2);
  const title = (await third.textContent()) as string;
  await third.click();
  await expect(page.getByTestId("space-current")).toContainText(title);
});

test("the default explore page is unchanged", async ({ page }) => {
  await page.goto("/explore");
  await expect(page.getByTestId("mode-globe")).toBeVisible();
});
