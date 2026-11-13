import { expect, test, type Page } from "@playwright/test";

const SHOTS = process.env.PL_SHOTS_DIR;
const ME = "00000000-0000-4000-8000-0000000000aa";
const ROUND = 30;
const GAP = 20;

type Game = "tiles" | "daily" | "flags";
type Screen = "round" | "reveal" | "results";

const PROMPTS: Record<Game, { mode: string; lang: string | null; gloss: string; choices: string[]; answer: string }> = {
  tiles: { mode: "tiles", lang: null, gloss: "cat", choices: ["es:gato", "fr:chat", "de:Hund", "ja:猫", "it:pane", "ar:قطة"], answer: "0,1,3,5" },
  daily: { mode: "form", lang: "es", gloss: "water", choices: ["agua", "pan", "casa", "sol"], answer: "agua" },
  flags: { mode: "flag", lang: null, gloss: "Katze", choices: ["de", "nl", "sv", "fr"], answer: "de" },
};

const REVEAL: Record<Game, unknown[]> = {
  tiles: [
    { lang: "es", word: "gato", roman: null, reading: { ipa: "ˈɡato" }, meaning: "cat", gloss: "cat, a small domestic feline", correct: true },
    { lang: "fr", word: "chat", roman: null, reading: { ipa: "ʃa" }, meaning: "cat", gloss: "cat, a small domestic feline", correct: true },
    { lang: "de", word: "Hund", roman: null, reading: null, meaning: "dog", gloss: "dog", correct: false },
    { lang: "ja", word: "猫", roman: "neko", reading: { kana: "ねこ", roman: "neko" }, meaning: "cat", gloss: "cat, a small domestic feline", correct: true },
    { lang: "it", word: "pane", roman: null, reading: null, meaning: "bread", gloss: "bread", correct: false },
    { lang: "ar", word: "قطة", roman: "qiṭṭa", reading: { roman: "qiṭṭa" }, meaning: "cat", gloss: "cat, a small domestic feline", correct: true },
  ],
  daily: [
    { lang: "es", word: "agua", roman: null, reading: { ipa: "ˈaɣwa" }, meaning: "water", gloss: "water, the clear liquid", correct: true },
    { lang: "es", word: "pan", roman: null, reading: null, meaning: "bread", gloss: "bread", correct: false },
    { lang: "es", word: "casa", roman: null, reading: null, meaning: "house", gloss: "house", correct: false },
    { lang: "es", word: "sol", roman: null, reading: null, meaning: "sun", gloss: "sun", correct: false },
  ],
  flags: [
    { lang: "de", word: "Katze", roman: null, reading: null, meaning: "cat", gloss: "cat", correct: true },
    { lang: "nl", word: "kat", roman: null, reading: null, meaning: "cat", gloss: "cat", correct: false },
    { lang: "sv", word: "katt", roman: null, reading: null, meaning: "cat", gloss: "cat", correct: false },
    { lang: "fr", word: "chat", roman: null, reading: null, meaning: "cat", gloss: "cat", correct: false },
  ],
};

function state(game: Game, screen: Screen, now: number, scores: Record<string, number>, t0: number) {
  const status = screen === "results" ? "done" : "playing";
  const startedAt = new Date(t0 - (screen === "round" ? 1_000 : screen === "reveal" ? (ROUND + 1) * 1000 : 600_000)).toISOString();
  const p = PROMPTS[game];
  const open = screen !== "round";
  return {
    id: "11111111-1111-4111-8111-111111111111",
    code: "ABC123",
    name: "Tiles: Romance",
    game,
    root: "en",
    targets: ["es", "fr", "ja", "ar"],
    seed: "42",
    status,
    listed: true,
    rounds: 8,
    roundSeconds: ROUND,
    revealSeconds: GAP,
    startedAt,
    version: 3,
    now: new Date(now).toISOString(),
    isHost: false,
    players: [
      { userId: ME, name: "Ana", handle: null, ready: true, score: scores[ME], isHost: false, isMe: true, online: true, answered: false, bot: false, skill: null, flag: null },
      { userId: "h", name: "Hana", handle: "hana_k", ready: true, score: scores.h, isHost: true, isMe: false, online: true, answered: true, bot: false, skill: null, flag: "JP" },
      { userId: "b1", name: "Mateo", handle: null, ready: true, score: scores.b1, isHost: false, isMe: false, online: true, answered: false, bot: true, skill: "medium", flag: "ES" },
      { userId: "b2", name: "Léa", handle: null, ready: true, score: scores.b2, isHost: false, isMe: false, online: true, answered: true, bot: true, skill: "hard", flag: "FR" },
    ],
    messages: [],
    round: null,
    prompts: [{ round: 0, mode: p.mode, lang: open || p.mode === "form" ? p.lang ?? "de" : null, gloss: p.gloss, choices: p.choices, answer: open ? p.answer : null, ...(open ? { reveal: REVEAL[game] } : {}) }],
    results: [],
    standing: true,
    botFill: false,
    botsEnabled: true,
    nextStartAt: screen === "results" ? new Date(now + 9_000).toISOString() : null,
  };
}

async function mockRoom(page: Page, game: Game, screen: Screen) {
  const scores: Record<string, number> = { [ME]: 0, h: 120, b1: 60, b2: 200 };
  const t0 = Date.now() + 8_000;
  await page.addInitScript(() => window.localStorage.setItem("polingual-web/lobby-nick/v1", "Ana"));
  await page.route("**/api/academy/lobbies/guest/merge", (r) => r.fulfill({ json: { ok: true } }));
  await page.route("**/api/academy/lobbies/guest", (r) => r.fulfill({ json: { token: "pl-guest.test", userId: ME, expiresAt: new Date(Date.now() + 3_600_000).toISOString() } }));
  await page.route("**/api/academy/lobbies?**", (r) => r.fulfill({ json: { lobbies: [], bots: true } }));
  await page.route("**/api/academy/lobbies/join", (r) => r.fulfill({ json: { lobby: state(game, screen, Date.now(), scores, t0) } }));
  await page.route("**/api/academy/lobbies/state**", (r) => r.fulfill({ json: { changed: true, lobby: state(game, screen, Date.now(), scores, t0) } }));
  await page.route("**/api/academy/lobbies/answer", (r) => {
    const body = r.request().postDataJSON() as { choice: string };
    const correct = body.choice === PROMPTS[game].answer;
    scores[ME] += correct ? 290 : 0;
    r.fulfill({ json: { correct, points: correct ? 290 : 0, ms: 900, lobby: state(game, screen, Date.now(), scores, t0) } });
  });
  await page.goto("/play/ABC123");
}

for (const width of [390, 1440]) {
  test.describe(`play at ${width}`, () => {
    test.use({ viewport: { width, height: width === 390 ? 844 : 900 } });

    test("tiles round shows Learn tiles with no language names and a live board", async ({ page }) => {
      await mockRoom(page, "tiles", "round");
      await expect(page.getByTestId("tiles")).toBeVisible({ timeout: 60_000 });
      await expect(page.getByTestId("round-count")).toHaveText("Round 1 of 8");
      await expect(page.getByTestId("game-progress")).toBeVisible();
      await expect(page.getByTestId("board-row")).toHaveCount(4);
      await expect(page.getByTestId("bot-tag")).toHaveCount(2);
      await expect(page.getByTestId("reveal")).toHaveCount(0);
      await expect(page.getByTestId("lang-card")).toHaveCount(0);
      const arena = page.locator("[data-testid=tiles]");
      for (const name of ["Spanish", "French", "Japanese", "Arabic"]) await expect(arena).not.toContainText(name);
      await expect(page.getByTestId("start-learning")).toBeVisible();
      const tile = page.getByTestId("tile").first();
      await expect(tile).toBeVisible();
      expect(await tile.evaluate((el) => getComputedStyle(el).backgroundImage)).toContain("gradient");
      await page.keyboard.press("d");
      await tile.dispatchEvent("pointerdown");
      await expect(page.locator("[data-testid=tile][data-tapped=true]").first()).toBeVisible();
      if (SHOTS) await page.screenshot({ path: `${SHOTS}/tiles-round-${width}.png` });
    });

    test("a word round answers through the server and moves the board", async ({ page }) => {
      await mockRoom(page, "daily", "round");
      await expect(page.getByTestId("prompt")).toHaveText("water", { timeout: 60_000 });
      await expect(page.getByTestId("reveal-definition")).toHaveCount(0);
      const mine = page.locator("[data-testid=board-row][data-me=true]");
      await expect(mine).toHaveAttribute("style", /translateY\(120px\)/);
      await page.getByTestId("choice").first().click();
      await expect(page.getByTestId("feedback")).toContainText("Right");
      await expect(page.getByTestId("my-score")).toHaveText("290");
      await expect(mine).toHaveAttribute("style", /translateY\(0px\)/);
      await expect(page.getByTestId("my-rank")).toHaveText("#1 of 4");
      if (SHOTS) await page.screenshot({ path: `${SHOTS}/daily-round-${width}.png` });
    });

    test("flags round shows language cards as choices", async ({ page }) => {
      await mockRoom(page, "flags", "round");
      await expect(page.getByTestId("prompt")).toContainText("Katze", { timeout: 60_000 });
      await expect(page.getByTestId("lang-card")).toHaveCount(4);
      await expect(page.getByTestId("reveal")).toHaveCount(0);
      if (SHOTS) await page.screenshot({ path: `${SHOTS}/flags-round-${width}.png` });
    });

    test("the reveal shows between rounds with a countdown and skip", async ({ page }) => {
      await mockRoom(page, "tiles", "reveal");
      await expect(page.getByTestId("reveal")).toBeVisible({ timeout: 60_000 });
      await expect(page.getByTestId("tiles")).toHaveCount(0);
      await expect(page.getByTestId("reveal-entry")).toHaveCount(6);
      const first = page.getByTestId("reveal-entry").first();
      await expect(first).toContainText("Spanish");
      await expect(first).toContainText("gato");
      await expect(first).toContainText("cat, a small domestic feline");
      await expect(page.getByTestId("reveal-entry").filter({ hasText: "猫" })).toContainText("ねこ · neko");
      await expect(page.getByTestId("next-round-count")).toHaveText(/^\d+$/);
      if (SHOTS) await page.screenshot({ path: `${SHOTS}/reveal-${width}.png`, fullPage: true });
      await page.getByTestId("skip-reveal").click();
      await expect(page.getByTestId("reveal")).toHaveCount(0);
      await expect(page.getByTestId("next-round")).toBeVisible();
    });

    test("results offer the next game, rematch, bots and learning", async ({ page }) => {
      await mockRoom(page, "tiles", "results");
      await expect(page.getByTestId("results")).toBeVisible({ timeout: 60_000 });
      await expect(page.getByTestId("next-game")).toContainText(/Next game: Tiles: Romance in \d+s/);
      await expect(page.getByTestId("rematch")).toBeVisible();
      await expect(page.getByTestId("play-bots")).toBeVisible();
      await expect(page.getByTestId("results-learn")).toHaveAttribute("href", "/app?from=play");
      await expect(page.getByTestId("reveal-all").getByTestId("reveal-entry")).toHaveCount(4);
      if (SHOTS) await page.screenshot({ path: `${SHOTS}/results-${width}.png`, fullPage: true });
    });
  });
}
