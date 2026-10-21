import { test, expect } from "@playwright/test";

const LEARN = "/research-os/learn";

for (const width of [1280, 390]) {
  test(`guest Learn hub at ${width} lists language systems above decks`, async ({ page }) => {
    await page.setViewportSize({ width, height: width === 390 ? 844 : 860 });
    await page.emulateMedia({ colorScheme: "light", reducedMotion: "reduce" });
    await page.goto(LEARN);
    const hub = page.locator('[data-learn-hub="languages"]');
    await expect(hub.getByRole("heading", { name: "language systems" })).toBeVisible();
    await expect(hub.locator('[data-system-card="available"]').first()).toBeVisible();
    for (const name of ["Romance", "Germanic", "Semitic"]) await expect(hub.getByRole("button", { name: `start ${name}` })).toBeVisible();
    await expect(hub.getByRole("list", { name: "Semitic languages" })).toContainText("Hebrew");
    await expect(page.locator('[data-learn-hub="decks"]')).toBeVisible();
    const hubTop = (await hub.boundingBox())!.y;
    const decksTop = (await page.locator('[data-learn-hub="decks"]').boundingBox())!.y;
    expect(hubTop).toBeLessThan(decksTop);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
    await page.evaluate(() => document.fonts.ready);
    await expect(page).toHaveScreenshot(`learn-hub-${width}.png`, { fullPage: true, animations: "disabled", caret: "hide", maxDiffPixelRatio: 0.01 });
  });
}

test("a guest starts Semitic from the hub and lands on its placement", async ({ page }) => {
  await page.goto(LEARN);
  await page.locator('[data-learn-hub="languages"]').getByRole("button", { name: "start Semitic" }).click();
  await expect(page).toHaveURL(new RegExp(`${LEARN}/languages/en-he-ar/place$`));
});
