import { expect, test, type Page } from "@playwright/test";

const FROZEN_AT = new Date("2026-10-18T12:00:00Z");
const SCREENS = [
  { name: "learn", hash: "#/learn" },
  { name: "progress", hash: "#/progress" },
  { name: "profile", hash: "#/profile" },
  { name: "settings", hash: "#/settings" },
];
const WIDTHS = [1280, 390];
const SCHEMES = ["light", "dark"] as const;

async function settle(page: Page): Promise<void> {
  await page.evaluate(() => document.fonts.ready);
  await page.evaluate(() => Promise.all([...document.images].map((i) => i.decode().catch(() => undefined))));
  let last = "";
  for (let same = 0; same < 4; ) {
    await page.waitForTimeout(250);
    const now = await page.locator("main").evaluate((m) => m.outerHTML);
    same = now === last ? same + 1 : 0;
    last = now;
  }
  await page.evaluate(() => window.scrollTo(0, 0));
}

test.describe.configure({ mode: "serial" });

let page: Page;

test.beforeAll(async ({ browser }, info) => {
  page = await browser.newPage({ baseURL: info.project.use.baseURL, viewport: { width: 1280, height: 860 }, colorScheme: "light", reducedMotion: "reduce" });
  await page.clock.setFixedTime(FROZEN_AT);
  await page.goto("/");
  await page.waitForSelector(".side nav a");
});

test.afterAll(async () => {
  await page.close();
});

for (const scheme of SCHEMES)
  for (const width of WIDTHS)
    test(`brand screens in ${scheme} at ${width}`, async () => {
      await page.setViewportSize({ width, height: 860 });
      await page.emulateMedia({ colorScheme: scheme });
      for (const s of SCREENS) {
        await page.evaluate((h) => (window.location.hash = h), s.hash);
        await page.waitForSelector("main h1, main h2");
        await settle(page);
        await expect(page.locator("html")).toHaveAttribute("data-skin", "brand");
        await expect(page.locator("html")).toHaveAttribute("data-scheme", scheme);
        await page.mouse.move(width - 1, 859);
        await expect(page).toHaveScreenshot(`${s.name}-${scheme}-${width}.png`, { fullPage: true });
      }
    });
