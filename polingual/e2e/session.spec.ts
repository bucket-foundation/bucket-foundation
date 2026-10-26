import { expect, test, type Page } from "@playwright/test";
import { mockApi, signIn } from "./mock";

const SHOTS = process.env.PL_SHOTS_DIR;

export const seeded = () => ({
  "lang-systems": { updated_at: new Date().toISOString(), data: { systems: [{ id: "en-es-fr", name: "Romance", root: "en", targets: ["es", "fr"], createdAt: 1, placement: { es: 0, fr: 0 }, levels: { es: "A1", fr: "A1" } }], removed: {} } },
});

async function answerOne(page: Page): Promise<void> {
  const body = page.getByTestId("session-body");
  const input = body.locator("input[type=text], textarea").first();
  if (await input.isVisible().catch(() => false)) {
    await input.fill("x");
    await input.press("Enter");
    return;
  }
  const selects = body.locator("select:enabled");
  for (let k = 0; k < (await selects.count()); k++) await selects.nth(k).selectOption({ index: 1 + (k % 2) }, { timeout: 1000 }).catch(() => undefined);
  const primary = body.getByRole("button", { name: /^(got it|check|continue|next|done)$/i }).first();
  const option = body.locator("button:enabled").filter({ hasNotText: /^play$/i }).first();
  const button = (await primary.isVisible().catch(() => false)) ? primary : option;
  if (await button.isVisible().catch(() => false)) await button.click({ timeout: 2000 }).catch(() => undefined);
}

for (const width of [1280, 390]) {
  test(`daily session fits without page scroll at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: width > 500 ? 800 : 844 });
    await mockApi(page, { branches: seeded() });
    await signIn(page);
    await page.goto("/app/en-es-fr/study");
    await expect(page.getByTestId("session")).toBeVisible({ timeout: 60_000 });
    await expect(page.getByTestId("counter")).toContainText("1 /");
    for (let n = 0; n < 4; n++) {
      const fits = await page.evaluate(() => ({ h: document.documentElement.scrollHeight <= window.innerHeight, w: document.documentElement.scrollWidth <= window.innerWidth }));
      expect(fits).toEqual({ h: true, w: true });
      if (n === 0 && SHOTS) await page.screenshot({ path: `${SHOTS}/session-${width}.png` });
      await page.getByTestId("skip-exercise").click();
    }
  });
}

test("grading syncs progress and the session ends with a score", async ({ page }) => {
  const api = await mockApi(page, { branches: seeded() });
  await signIn(page);
  await page.goto("/app/en-es-fr/study");
  await expect(page.getByTestId("session")).toBeVisible({ timeout: 60_000 });
  for (let n = 0; n < 8; n++) await answerOne(page);
  await expect(async () => {
    const skip = page.getByTestId("skip-exercise");
    if (await skip.isVisible()) await skip.click({ timeout: 1000 });
    await expect(page.getByTestId("session-done")).toBeVisible({ timeout: 300 });
  }).toPass({ timeout: 60_000 });
  await expect(page.getByTestId("session-score")).toContainText("right");
  await expect.poll(() => api.posts.some((p) => p.branch === "lang-sys-en-es-fr"), { timeout: 10_000 }).toBe(true);
});
