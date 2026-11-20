import { expect, test } from "@playwright/test";

const ROUTES = ["/play", "/play/flag-tiles", "/play/babel-match", "/play/polyword", "/play/mini", "/play/forehead", "/play/word-snake"];

for (const [width, height] of [[390, 844], [360, 780]]) {
  test.describe(`play on a ${width} phone`, () => {
    test.use({ viewport: { width, height }, isMobile: true, hasTouch: true });

    for (const path of ROUTES) {
      test(`${path} fits the screen with thumb-sized header controls`, async ({ page }) => {
        await page.goto(path);
        const frame = page.getByTestId("play-frame");
        const bar = frame.locator(":scope > header");
        await expect(frame).toBeVisible({ timeout: 60_000 });
        expect(await frame.evaluate((el) => getComputedStyle(el).touchAction)).toBe("manipulation");
        expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
        for (const el of await bar.locator("a:visible, button:visible").all()) {
          const box = (await el.boundingBox())!;
          expect(box.height, await el.innerText()).toBeGreaterThanOrEqual(44);
          expect(box.width, await el.innerText()).toBeGreaterThanOrEqual(44);
          expect(box.x).toBeGreaterThanOrEqual(0);
          expect(box.x + box.width).toBeLessThanOrEqual(width);
        }
        const header = bar.locator("a:visible, button:visible");
        const boxes = await Promise.all((await header.all()).map(async (el) => (await el.boundingBox())!));
        for (let i = 1; i < boxes.length; i++) expect(boxes[i].x).toBeGreaterThanOrEqual(boxes[i - 1].x + boxes[i - 1].width - 1);
      });
    }
  });
}
