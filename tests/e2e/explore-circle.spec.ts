import { test, expect } from "@playwright/test";

test.use({ viewport: { width: 1440, height: 900 } });

test("the circle view renders the chart on sample data", async ({ page }) => {
  await page.goto("/explore?view=circle");
  await expect(page.getByTestId("space-view")).toBeVisible();
  await expect(page.getByTestId("sample-badge")).toHaveText("sample data");
  const chart = page.getByTestId("circle-chart");
  await expect(chart).toBeVisible();
  await expect(chart.locator("g[data-series=mean]")).toHaveAttribute("data-vertices", "4");
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
  await page.getByRole("button", { name: "Sample Advisor C" }).click();
  await expect(page.getByTestId("space-current")).toContainText("Sample Advisor C");
});

test("the default explore page is unchanged", async ({ page }) => {
  await page.goto("/explore");
  await expect(page.getByTestId("mode-globe")).toBeVisible();
});
