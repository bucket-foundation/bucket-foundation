import { expect, test, type Locator, type Page } from "@playwright/test";

const ROUTES = ["/play", "/play/flag-tiles", "/play/babel-match", "/play/polyword", "/play/mini", "/play/forehead", "/play/word-snake", "/play/voice-atlas", "/play/daily-set"];
const PHONES: [number, number][] = [[390, 844], [360, 780], [320, 640]];
const ME = "00000000-0000-4000-8000-0000000000aa";

async function atLeast44(items: Locator, label: string) {
  const all = await items.all();
  expect(all.length, `${label} on screen`).toBeGreaterThan(0);
  for (const el of all) {
    const box = (await el.boundingBox())!;
    expect(box.height, `${label} ${await el.innerText()}`).toBeGreaterThanOrEqual(44);
    expect(box.width, `${label} ${await el.innerText()}`).toBeGreaterThanOrEqual(44);
  }
}

async function fits(page: Page, width: number) {
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
}

function lobby(now: number) {
  const reveal = [
    { lang: "es", word: "gato", roman: null, reading: { ipa: "ˈɡato" }, meaning: "cat", gloss: "cat, a small domestic feline", correct: true },
    { lang: "ja", word: "猫", roman: "neko", reading: { kana: "ねこ", roman: "neko" }, meaning: "cat", gloss: "cat", correct: true },
  ];
  return {
    id: "11111111-1111-4111-8111-111111111111", code: "ABC123", name: "Tiles: Romance", game: "tiles", root: "en", targets: ["es", "ja"], seed: "42",
    status: "done", listed: true, rounds: 8, roundSeconds: 30, revealSeconds: 20, startedAt: new Date(now - 600_000).toISOString(), version: 3,
    now: new Date(now).toISOString(), isHost: false,
    players: [
      { userId: ME, name: "Ana", handle: null, ready: true, score: 0, isHost: false, isMe: true, online: true, answered: false, bot: false, skill: null, flag: null },
      { userId: "h", name: "Hana", handle: null, ready: true, score: 120, isHost: true, isMe: false, online: true, answered: true, bot: false, skill: null, flag: "JP" },
    ],
    messages: [], round: null,
    prompts: [
      { round: 0, mode: "tiles", lang: null, gloss: "cat", choices: ["es:gato", "ja:猫", "de:Hund"], answer: "0,1", reveal },
      { round: 1, mode: "form", lang: "es", gloss: "cat", choices: ["gato", "pan"], answer: "gato", reveal },
    ],
    setup: "single", playlist: ["tiles"], results: [], standing: true, botFill: false, botsEnabled: true,
    nextStartAt: new Date(now + 9_000).toISOString(), coins: 3, powers: [],
  };
}

async function mockResults(page: Page) {
  await page.addInitScript(() => window.localStorage.setItem("polingual-web/lobby-nick/v1", "Ana"));
  await page.route("**/api/academy/lobbies/guest/merge", (r) => r.fulfill({ json: { ok: true } }));
  await page.route("**/api/academy/lobbies/guest", (r) => r.fulfill({ json: { token: "pl-guest.test", userId: ME, expiresAt: new Date(Date.now() + 3_600_000).toISOString() } }));
  await page.route("**/api/academy/lobbies?**", (r) => r.fulfill({ json: { lobbies: [], bots: true } }));
  await page.route("**/api/academy/lobbies/join", (r) => r.fulfill({ json: { lobby: lobby(Date.now()) } }));
  await page.route("**/api/academy/lobbies/state**", (r) => r.fulfill({ json: { changed: true, lobby: lobby(Date.now()) } }));
  await page.goto("/play/ABC123");
}

for (const [width, height] of PHONES) {
  test.describe(`play on a ${width} phone`, () => {
    test.use({ viewport: { width, height }, isMobile: true, hasTouch: true });

    for (const path of ROUTES) {
      test(`${path} fits the screen with thumb-sized header controls`, async ({ page }) => {
        await page.goto(path);
        const frame = page.getByTestId("play-frame");
        const bar = frame.locator(":scope > header");
        await expect(frame).toBeVisible({ timeout: 60_000 });
        expect(await frame.evaluate((el) => getComputedStyle(el).touchAction)).toBe("manipulation");
        await fits(page, width);
        await atLeast44(bar.locator("a:visible, button:visible"), "header control");
        const boxes = await Promise.all((await bar.locator("a:visible, button:visible").all()).map(async (el) => (await el.boundingBox())!));
        for (const box of boxes) {
          expect(box.x).toBeGreaterThanOrEqual(0);
          expect(box.x + box.width).toBeLessThanOrEqual(width);
        }
        for (let i = 1; i < boxes.length; i++) expect(boxes[i].x).toBeGreaterThanOrEqual(boxes[i - 1].x + boxes[i - 1].width - 1);
      });
    }

    test("results links and missed-word chips are thumb-sized", async ({ page }) => {
      await mockResults(page);
      await expect(page.getByTestId("results")).toBeVisible({ timeout: 60_000 });
      await fits(page, width);
      await atLeast44(page.locator("[data-testid=reveal-learn]:visible"), "reveal link");
      await atLeast44(page.locator("[data-testid=mute]:visible"), "sound toggle");
      await atLeast44(page.locator("[data-testid=learn-missed]:visible"), "missed-word chip");
    });

    test("Polyword language chips are thumb-sized", async ({ page }) => {
      await page.goto("/play/polyword");
      await expect(page.getByTestId("pw-langs")).toBeVisible({ timeout: 60_000 });
      const chips = page.locator("[data-testid=pw-langs] button");
      for (const el of (await chips.all()).slice(0, 3)) expect((await el.boundingBox())!.height).toBeGreaterThanOrEqual(44);
    });

    test("Mini cells, blocks and clues are thumb-sized and fit", async ({ page }) => {
      await page.goto("/play/mini");
      const grid = page.getByTestId("mini-grid");
      await expect(grid).toBeVisible({ timeout: 60_000 });
      await fits(page, width);
      const cols = Number(await grid.evaluate((el) => getComputedStyle(el).getPropertyValue("--cols") || "5"));
      const sizes = await grid.evaluate((el) => [...el.children].map((c) => Math.round(c.getBoundingClientRect().width)));
      expect(new Set(sizes).size, "cells and blocks share one size").toBe(1);
      if (cols <= 5) expect(sizes[0]).toBeGreaterThanOrEqual(44);
      const g = (await grid.boundingBox())!;
      expect(g.x + g.width).toBeLessThanOrEqual(width);
      await atLeast44(page.locator("[data-testid=mini-clue]:visible"), "clue");
    });

    test("Babel Match words fit inside their cells", async ({ page }) => {
      await page.goto("/play/babel-match");
      await expect(page.getByTestId("bm-cell").first()).toBeVisible({ timeout: 60_000 });
      await fits(page, width);
      const cut = await page.getByTestId("bm-cell").evaluateAll((cells) =>
        cells.flatMap((c) => [...c.querySelectorAll("span")].filter((s) => s.textContent && s.scrollWidth > s.clientWidth + 1 && (s.textContent?.length ?? 0) <= 7).map((s) => s.textContent)),
      );
      expect(cut, "words of seven letters or fewer show in full").toEqual([]);
    });
  });
}
