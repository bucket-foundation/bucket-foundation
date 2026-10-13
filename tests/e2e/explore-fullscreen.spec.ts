import { test, expect } from "@playwright/test";

test.use({ viewport: { width: 1440, height: 900 } });

async function ready(page: import("@playwright/test").Page) {
  await page.goto("/explore?view=circle");
  await expect(page.getByTestId("circle-chart")).toBeVisible();
  await expect(page.getByTestId("scrubber")).toBeVisible();
}

test("the expand control turns the base layer full screen and floats the controls", async ({ page }) => {
  await ready(page);
  const shell = page.getByTestId("explore-shell");
  await expect(shell).toHaveAttribute("data-expanded", "false");
  await page.getByRole("button", { name: "expand to fullscreen" }).click();
  await expect(shell).toHaveAttribute("data-expanded", "true");
  const box = (await shell.boundingBox())!;
  expect(box.x).toBe(0);
  expect(box.y).toBe(0);
  expect(box.width).toBe(1440);
  expect(box.height).toBe(900);
  const overlay = page.getByTestId("widget-overlay");
  await expect(overlay.getByTestId("shell-query")).toBeVisible();
  await expect(overlay.getByTestId("scrubber")).toBeVisible();
  await expect(overlay.getByRole("radiogroup", { name: "view" })).toBeVisible();
  const radius = await page.locator('[data-widget="search"]').evaluate((el) => parseFloat(getComputedStyle(el).borderTopLeftRadius));
  expect(radius).toBeGreaterThanOrEqual(12);
  const base = (await page.getByTestId("base-layer").boundingBox())!;
  expect(base.width).toBe(1440);
  expect(base.height).toBe(900);
});

test("Escape and the exit button restore the normal layout", async ({ page }) => {
  await ready(page);
  const shell = page.getByTestId("explore-shell");
  await page.getByRole("button", { name: "expand to fullscreen" }).click();
  await expect(shell).toHaveAttribute("data-expanded", "true");
  await page.keyboard.press("Escape");
  await expect(shell).toHaveAttribute("data-expanded", "false");
  await expect(page.getByRole("link", { name: /bucket.foundation/i }).first()).toBeVisible();
  await page.getByRole("button", { name: "expand to fullscreen" }).click();
  await page.getByRole("button", { name: "exit fullscreen" }).click();
  await expect(shell).toHaveAttribute("data-expanded", "false");
});

test("the view and item survive the layout change", async ({ page }) => {
  await ready(page);
  await page.getByRole("slider", { name: /observations/ }).focus();
  await page.keyboard.press("ArrowRight");
  await page.keyboard.press("ArrowRight");
  await expect(page.getByTestId("scrubber")).toHaveAttribute("data-index", "2");
  await page.getByRole("button", { name: "expand to fullscreen" }).click();
  await expect(page.getByTestId("scrubber")).toHaveAttribute("data-index", "2");
  await page.getByTestId("widget-overlay").getByRole("radio", { name: "sphere", exact: true }).click();
  await expect(page.getByTestId("surface-view")).toHaveAttribute("data-mode", "sphere");
  await page.keyboard.press("Escape");
  await expect(page.getByTestId("surface-view")).toHaveAttribute("data-mode", "sphere");
});

test("a widget collapses to its header", async ({ page }) => {
  await ready(page);
  await page.getByRole("button", { name: "expand to fullscreen" }).click();
  const widget = page.locator('[data-widget="view"]');
  await expect(widget.getByRole("radiogroup", { name: "view" })).toBeVisible();
  await page.getByTestId("widget-toggle-view").click();
  await expect(widget).toHaveAttribute("data-collapsed", "true");
  await expect(widget.getByRole("radiogroup", { name: "view" })).toBeHidden();
  await page.getByTestId("widget-toggle-view").click();
  await expect(widget.getByRole("radiogroup", { name: "view" })).toBeVisible();
});

test("Tab stays inside the full-screen overlay and focus returns on exit", async ({ page }) => {
  await ready(page);
  await page.getByRole("button", { name: "expand to fullscreen" }).click();
  const shell = page.getByTestId("explore-shell");
  await expect(shell).toHaveAttribute("data-expanded", "true");
  await expect(page.getByRole("button", { name: "exit fullscreen" })).toBeFocused();
  for (let i = 0; i < 60; i++) {
    await page.keyboard.press("Tab");
    const inside = await page.evaluate(() => !!document.activeElement && !!document.querySelector('[data-testid="explore-shell"]')?.contains(document.activeElement));
    expect(inside).toBe(true);
  }
  for (let i = 0; i < 60; i++) {
    await page.keyboard.press("Shift+Tab");
    const inside = await page.evaluate(() => !!document.querySelector('[data-testid="explore-shell"]')?.contains(document.activeElement));
    expect(inside).toBe(true);
  }
  await page.keyboard.press("Escape");
  await expect(shell).toHaveAttribute("data-expanded", "false");
  await expect(page.getByRole("button", { name: "expand to fullscreen" })).toBeFocused();
});
