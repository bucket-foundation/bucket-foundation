import { expect, test, type Page } from "@playwright/test";

const FROZEN_AT = new Date("2026-10-18T12:00:00Z");

test.describe.configure({ mode: "serial" });

let page: Page;

test.beforeAll(async ({ browser }, info) => {
  const { baseURL, viewport, deviceScaleFactor, locale, timezoneId, colorScheme, reducedMotion } = info.project.use;
  page = await browser.newPage({ baseURL, viewport, deviceScaleFactor, locale, timezoneId, colorScheme, reducedMotion });
  await page.clock.setFixedTime(FROZEN_AT);
  await page.goto("/");
  await page.waitForSelector(".side nav a");
});

test.afterAll(async () => {
  await page.close();
});

async function open(hash: string, ready: string): Promise<void> {
  await page.evaluate((h) => (window.location.hash = h), hash);
  await page.waitForSelector(ready);
  await settle();
}

async function settle(): Promise<void> {
  await page.evaluate(() => document.fonts.ready);
  let last = "";
  for (let same = 0; same < 4; ) {
    await page.waitForTimeout(250);
    const now = await page.locator("main").evaluate((m) => m.outerHTML);
    same = now === last ? same + 1 : 0;
    last = now;
  }
  await page.evaluate(() => window.scrollTo(0, 0));
}

async function freeze(name: string): Promise<void> {
  const dom = await page.locator("main").evaluate((m) => m.outerHTML);
  expect(dom).toMatchSnapshot(`${name}.html`);
  await expect(page).toHaveScreenshot(`${name}.png`, { fullPage: true });
}

test("deck study shows a new atom, its answer, and the next card after a grade", async () => {
  await open("#/learn/03-chemistry", ".card h2");
  await freeze("deck-new-atom");
  await page.click("text=Show answer");
  await settle();
  await freeze("deck-answer");
  await page.click(".card button.r3");
  await settle();
  await freeze("deck-after-grade");
});

test("word lesson shows its word cards", async () => {
  await open("#/words/ar/1", ".word-cards");
  await freeze("word-lesson-ar-1");
});

test("review shows the queue after one graded card", async () => {
  await open("#/review", "main h1");
  await freeze("review");
});
