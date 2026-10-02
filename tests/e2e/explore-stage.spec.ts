import { test, expect } from "@playwright/test";

test.use({ viewport: { width: 1440, height: 900 } });

test("canon search loads with its heading and a canvas", async ({ page }) => {
  await page.goto("/canon/search");
  await expect(page.getByRole("heading", { level: 1, name: "Search the canon." })).toBeVisible();
  await expect(page.locator("canvas").first()).toBeVisible();
});

test("canon search switches between the globe and circle views", async ({ page }) => {
  await page.goto("/canon/search?view=globe");
  await expect(page.locator("canvas").first()).toBeVisible();
  await page.goto("/canon/search?view=circle");
  await expect(page.locator("canvas").first()).toBeVisible();
  await expect(page.getByRole("button", { name: "expand to fullscreen" })).toBeVisible();
});

test("explore still loads with the globe mode selected", async ({ page }) => {
  await page.goto("/explore");
  await expect(page.getByRole("tablist", { name: "Mode" })).toBeVisible();
  await expect(page.getByTestId("mode-globe")).toHaveAttribute("aria-selected", "true");
  await expect(page.locator("canvas").first()).toBeVisible();
});

test("explore mode switch changes the selected mode and the URL", async ({ page }) => {
  await page.goto("/explore");
  for (const id of ["helix", "atom", "globe"]) {
    await page.getByTestId(`mode-${id}`).click();
    await expect(page.getByTestId(`mode-${id}`)).toHaveAttribute("aria-selected", "true");
    await expect(page).toHaveURL(new RegExp(`mode=${id}`));
  }
});

test("explore reads the mode from the URL", async ({ page }) => {
  await page.goto("/explore?mode=helix");
  await expect(page.getByTestId("mode-helix")).toHaveAttribute("aria-selected", "true");
});
