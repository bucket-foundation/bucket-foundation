import { test, expect } from "@playwright/test";

test.use({ viewport: { width: 1440, height: 900 } });

test("the cylinder view draws one surface over the slices", async ({ page }) => {
  await page.goto("/explore?space=cylinder");
  await expect(page.getByTestId("surface-view")).toHaveAttribute("data-mode", "cylinder");
  await expect(page.locator('[data-testid="surface-view"] canvas')).toBeVisible();
  await expect(page.getByTestId("surface-status")).toContainText("surface of");
});

test("the sphere view places every observation", async ({ page }) => {
  await page.goto("/explore?space=sphere");
  await expect(page.getByTestId("surface-view")).toHaveAttribute("data-mode", "sphere");
  await expect(page.getByTestId("surface-status")).toContainText("6 of 6");
  await expect(page.getByTestId("time-slider")).toHaveCount(0);
});

test("the time slider filters the sphere by year", async ({ page }) => {
  await page.goto("/explore?space=sphere-time");
  const status = page.getByTestId("surface-status");
  await expect(status).toContainText("6 of 6");
  const slider = page.getByTestId("time-slider");
  await slider.fill(String(await slider.getAttribute("min")));
  const visible = Number(await status.getAttribute("data-visible"));
  expect(visible).toBeLessThan(6);
  expect(visible).toBeGreaterThanOrEqual(1);
  await slider.fill(String(await slider.getAttribute("max")));
  await expect(status).toContainText("6 of 6");
});

test("the view switch reaches every surface view", async ({ page }) => {
  await page.goto("/explore?view=circle");
  for (const v of ["cylinder", "sphere", "sphere-time"]) {
    await page.getByRole("radio", { name: v, exact: true }).click();
    await expect(page.getByTestId("surface-view")).toHaveAttribute("data-mode", v);
    await expect(page).toHaveURL(new RegExp(`space=${v}`));
  }
});
