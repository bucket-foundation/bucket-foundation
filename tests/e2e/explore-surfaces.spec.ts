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
  const status = page.getByTestId("surface-status");
  const visible = Number(await status.getAttribute("data-visible"));
  expect(visible).toBeGreaterThan(100);
  await expect(status).toContainText(`${visible} of ${visible}`);
  await expect(page.getByRole("slider", { name: "year" })).toHaveCount(0);
});

test("the time slider filters the sphere by year", async ({ page }) => {
  await page.goto("/explore?space=sphere-time");
  const status = page.getByTestId("surface-status");
  const total = Number(await status.getAttribute("data-visible"));
  const slider = page.getByRole("slider", { name: "year" });
  await slider.focus();
  await page.keyboard.press("Home");
  const visible = Number(await status.getAttribute("data-visible"));
  expect(visible).toBeLessThan(total);
  expect(visible).toBeGreaterThanOrEqual(1);
  await page.keyboard.press("End");
  await expect(status).toContainText(`${total} of ${total}`);
});

test("the view switch reaches every surface view", async ({ page }) => {
  await page.goto("/explore?view=circle");
  for (const v of ["cylinder", "sphere", "sphere-time"]) {
    await page.getByRole("radio", { name: v, exact: true }).click();
    await expect(page.getByTestId("surface-view")).toHaveAttribute("data-mode", v);
    await expect(page).toHaveURL(new RegExp(`space=${v}`));
  }
});

test("scroll steps the sweep variable in the sphere and never zooms it", async ({ page }) => {
  await page.goto("/explore?space=sphere-time");
  const scrubber = page.getByTestId("scrubber");
  await expect(page.getByTestId("time-year")).toContainText("observations");
  await expect.poll(async () => Number(await scrubber.getAttribute("data-index"))).toBeGreaterThan(5);
  const before = Number(await scrubber.getAttribute("data-index"));
  const view = page.getByTestId("surface-view");
  const box = (await view.boundingBox())!;
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.wheel(0, -120);
  await expect(scrubber).toHaveAttribute("data-index", String(before - 1));
  await page.waitForTimeout(250);
  await page.mouse.wheel(0, 120);
  await expect(scrubber).toHaveAttribute("data-index", String(before));
});

test("the surface views have a scrubber and no item buttons", async ({ page }) => {
  for (const v of ["cylinder", "sphere", "sphere-time"]) {
    await page.goto(`/explore?space=${v}`);
    await expect(page.getByTestId("scrubber")).toBeVisible();
    await expect(page.locator("button[aria-pressed]")).toHaveCount(0);
  }
});
