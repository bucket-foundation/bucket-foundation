import { expect, test, type Page } from "@playwright/test";
import { mockCorpus } from "./daily-mock";
import { mockApi, signIn } from "./mock";

async function open(page: Page, path: string) {
  await mockCorpus(page);
  await page.goto(path);
}

async function revisit(page: Page, path: string) {
  await expect(page.getByTestId("daily-results")).toBeVisible({ timeout: 20_000 });
  await expect(page.getByTestId("daily-learn")).toHaveAttribute("href", /\/app/);
  await page.goto(path);
  await expect(page.getByTestId("daily-results")).toBeVisible({ timeout: 60_000 });
  await expect(page.getByTestId("daily-score")).toBeVisible();
}

test("daily set plays six words, then keeps today's result", async ({ page }) => {
  await open(page, "/play/daily-set");
  for (let n = 0; n < 6; n++) {
    const right = page.locator('[data-testid=daily-choice][data-answer=yes]');
    await expect(right).toHaveCount(1, { timeout: 60_000 });
    await right.click();
    await page.waitForTimeout(800);
  }
  await expect(page.getByTestId("daily-score")).toHaveText("6 of 6");
  await expect(page.getByTestId("reveal-entry")).toHaveCount(6);
  await revisit(page, "/play/daily-set");
  await page.goto("/play");
  await expect(page.getByTestId("daily-state-daily-set")).toHaveText("Done today · 6 of 6", { timeout: 60_000 });
  await expect(page.getByTestId("daily-state-mini")).toHaveText("Play today");
});

test("mini fills every clue, then keeps today's result", async ({ page }) => {
  await open(page, "/play/mini");
  const clues = page.getByTestId("mini-clue");
  await expect(clues.first()).toBeVisible({ timeout: 60_000 });
  for (let n = 0; n < (await clues.count()); n++) {
    const answer = (await clues.nth(n).getAttribute("data-answer")) ?? "";
    await clues.nth(n).click();
    for (const ch of answer) await page.keyboard.type(ch);
  }
  await page.getByTestId("mini-check").click();
  await expect(page.getByTestId("daily-score")).toHaveText(/(\d) of \1/);
  await revisit(page, "/play/mini");
});

test("word groups solves four groups, then keeps today's result", async ({ page }) => {
  await open(page, "/play/word-groups");
  await expect(page.getByTestId("groups-tile").first()).toBeVisible({ timeout: 60_000 });
  for (let k = 0; k < 4; k++) {
    const group = await page.getByTestId("groups-tile").first().getAttribute("data-group");
    const tiles = page.locator(`[data-testid=groups-tile][data-group="${group}"]`);
    for (let n = 0; n < 4; n++) await tiles.nth(n).click();
    await page.getByTestId("groups-submit").click();
  }
  await expect(page.getByTestId("daily-score")).toHaveText("4 of 4");
  await revisit(page, "/play/word-groups");
});

test("speed match pairs fifteen words, then keeps today's result", async ({ page }) => {
  await open(page, "/play/speed-match");
  await page.getByTestId("speed-start").click({ timeout: 60_000 });
  for (let n = 0; n < 15; n++) {
    const m = page.locator("[data-testid=speed-meaning]:enabled").first();
    const id = await m.getAttribute("data-id");
    await m.click();
    await page.locator(`[data-testid=speed-form][data-id="${id}"]`).click();
  }
  await expect(page.getByTestId("daily-score")).toHaveText("15 of 15");
  await revisit(page, "/play/speed-match");
});

test("which voice asks ten languages, then keeps today's result", async ({ page }) => {
  await open(page, "/play/which-voice");
  for (let n = 0; n < 10; n++) {
    const right = page.locator("[data-testid=voice-choice][data-answer=yes]");
    await expect(right).toHaveCount(1, { timeout: 60_000 });
    await right.click();
    await page.waitForTimeout(800);
  }
  await expect(page.getByTestId("daily-score")).toHaveText("10 of 10");
  await revisit(page, "/play/which-voice");
});

test("letter sprint finds eight letters, then keeps today's result", async ({ page }) => {
  await open(page, "/play/letter-sprint");
  await page.getByTestId("letter-start").click({ timeout: 60_000 });
  for (let n = 0; n < 8; n++) await page.locator("[data-testid=letter-choice][data-answer=yes]").click();
  await expect(page.getByTestId("daily-score")).toHaveText("8 of 8");
  await revisit(page, "/play/letter-sprint");
});

test("a second device shows the account's saved result and saves without replaying", async ({ page }) => {
  const now = new Date();
  const day = `${now.getFullYear()}-${now.getMonth() + 1}-${now.getDate()}`;
  const saved = { game: "daily-set", day, score: 3, total: 6, pattern: "101010", savedAt: 1, words: [] };
  const api = await mockApi(page, { branches: { "polingual-daily": { data: { results: { [`daily-set|${day}`]: saved } }, updated_at: now.toISOString() } } });
  await mockCorpus(page);
  await signIn(page);
  await page.goto("/play/daily-set");
  await expect(page.getByTestId("daily-score")).toHaveText("3 of 6", { timeout: 60_000 });
  await expect(page.getByTestId("daily-saved")).toHaveText("Saved to your account.");
  await page.goto("/play");
  await expect(page.getByTestId("daily-state-daily-set")).toHaveText("Done today · 3 of 6", { timeout: 60_000 });
  await page.goto("/play/mini");
  const clues = page.getByTestId("mini-clue");
  await expect(clues.first()).toBeVisible({ timeout: 60_000 });
  for (let n = 0; n < (await clues.count()); n++) {
    await clues.nth(n).click();
    for (const ch of (await clues.nth(n).getAttribute("data-answer")) ?? "") await page.keyboard.type(ch);
  }
  await page.getByTestId("mini-check").click();
  await expect(page.getByTestId("daily-saved")).toHaveText("Saved to your account.", { timeout: 20_000 });
  const results = (api.branches["polingual-daily"].data as { results: Record<string, unknown> }).results;
  expect(Object.keys(results).sort()).toEqual([`daily-set|${day}`, `mini|${day}`]);
});
