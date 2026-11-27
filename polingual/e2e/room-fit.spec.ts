import { expect, test, type Page } from "@playwright/test";

const ME = "00000000-0000-4000-8000-0000000000aa";
const SHOTS = process.env.PL_SHOTS_DIR;
const ROUND = 20;
const GAP = 4;

const SIZES: [number, number][] = [
  [360, 640],
  [375, 667],
  [390, 844],
  [430, 932],
  [644, 913],
  [768, 1024],
  [844, 390],
];

type State = "join" | "waiting" | "countdown" | "round" | "reveal" | "results" | "final";
const STATES: State[] = ["join", "waiting", "countdown", "round", "reveal", "results", "final"];

const REVEAL = [
  { lang: "es", word: "gato", roman: null, reading: { ipa: "ˈɡato" }, meaning: "cat", gloss: "cat, a small domestic feline", correct: true },
  { lang: "de", word: "Hund", roman: null, reading: null, meaning: "dog", gloss: "dog", correct: false },
  { lang: "fr", word: "pain", roman: null, reading: null, meaning: "bread", gloss: "bread", correct: false },
  { lang: "ja", word: "家", roman: "ie", reading: { kana: "いえ", roman: "ie" }, meaning: "house", gloss: "house", correct: false },
];

const LONG = ["es:refrigerador", "de:Kühlschrankmagnet", "fr:réfrigérateur", "pt:geladeira portátil"];

function lobby(state: State, t0: number, screen = false, long = false) {
  const started = state === "countdown" ? t0 + 2_500 : state === "round" ? t0 - 1_000 : state === "reveal" ? t0 - (ROUND + 1) * 1000 : t0 - 900_000;
  const status = state === "waiting" || state === "join" ? "lobby" : state === "results" || state === "final" ? "done" : "playing";
  const open = state !== "round" && state !== "countdown";
  const names = ["Ana", "Hana", "Mateo", "Léa", "Kofi", "Sven", "Yuki", "Omar"];
  return {
    id: "11111111-1111-4111-8111-111111111111", code: "Y3G7Y5", name: "Ana's lobby", game: "same-word", root: "en", targets: ["es", "fr", "de", "ja"], seed: "42", status, listed: true, rounds: 6, roundSeconds: ROUND, revealSeconds: GAP,
    startedAt: status === "lobby" ? null : new Date(started).toISOString(), version: 3, now: new Date().toISOString(), isHost: true,
    players: names.slice(screen ? 1 : 0).map((name) => ({ i: names.indexOf(name), name })).map(({ i, name }) => ({ userId: i === 0 ? ME : `p${i}`, name, handle: null, ready: i % 3 !== 2, score: 400 - i * 40, total: 1200 - i * 90, isHost: i === 0, isMe: i === 0, online: true, answered: false, bot: false, skill: null, flag: null, firstRound: 0, continues: 0 })),
    messages: [], round: null,
    prompts: Array.from({ length: open ? 6 : 1 }, (_, r) => ({ round: r, mode: "mixed", lang: null, gloss: "cat", choices: long ? LONG : ["es:gato", "de:Hund", "fr:pain", "ja:家"], answer: open ? "es:gato" : null, ...(open ? { reveal: REVEAL } : {}) })),
    results: [], standing: false, botFill: false, botsEnabled: true, nextStartAt: state === "results" ? new Date(t0 + 8_000).toISOString() : null, ended: state === "final", canEnd: true, setup: "sequence", playlist: ["same-word", "flags"], coins: 0, powers: [],
  };
}

async function open(page: Page, state: State, screen = false, long = false) {
  const t0 = Date.now();
  if (state !== "join") await page.addInitScript(() => window.localStorage.setItem("polingual-web/lobby-nick/v1", "Ana"));
  await page.addInitScript(() => window.localStorage.setItem("polingual-web/save-score-prompt/v1", "seen"));
  await page.route("**/api/academy/lobbies/guest/merge", (r) => r.fulfill({ json: { ok: true } }));
  await page.route("**/api/academy/lobbies/guest", (r) => r.fulfill({ json: { token: "pl-guest.test", userId: ME, expiresAt: new Date(Date.now() + 3_600_000).toISOString() } }));
  await page.route("**/api/academy/lobbies/join", (r) => r.fulfill({ json: { lobby: lobby(state, t0, screen, long) } }));
  await page.route("**/api/academy/lobbies/state**", (r) => r.fulfill({ json: { changed: true, lobby: lobby(state, t0, screen, long) } }));
  await page.route("**/api/academy/lobbies?**", (r) => r.fulfill({ json: { lobbies: [], bots: false, games: [] } }));
  await page.goto("/play/Y3G7Y5");
  const marker = screen ? (state === "waiting" ? "waiting-board" : "tv-board") : { join: "room-gate", waiting: "waiting-board", countdown: "countdown", round: "hud", reveal: "hud", results: "results", final: "final" }[state];
  await expect(page.getByTestId(marker)).toBeVisible();
  await page.waitForTimeout(400);
}

for (const [w, h] of SIZES) {
  for (const state of STATES) {
    test(`room ${state} fits ${w}x${h} with no page scroll`, async ({ page }) => {
      await page.setViewportSize({ width: w, height: h });
      await open(page, state);
      const fit = await page.evaluate(() => ({ sh: document.scrollingElement!.scrollHeight, sw: document.scrollingElement!.scrollWidth, ih: window.innerHeight, iw: window.innerWidth }));
      if (SHOTS) await page.screenshot({ path: `${SHOTS}/room-${state}-${w}x${h}.png` });
      expect(fit.sh).toBeLessThanOrEqual(fit.ih);
      expect(fit.sw).toBeLessThanOrEqual(fit.iw);
      if (state === "waiting") await expect(page.getByTestId("ready")).toBeInViewport();
      if (state === "round") for (const c of await page.getByTestId("choice").all()) await expect(c).toBeInViewport({ ratio: 0.9 });
      if (state === "results") await expect(page.getByTestId("next-game")).toBeInViewport();
    });
  }
}

for (const [w, h] of [[1920, 1080], [1280, 720]] as const) {
  for (const state of ["waiting", "round", "results"] as const) {
    test(`host screen ${state} fits ${w}x${h} with large answers`, async ({ page }) => {
      await page.setViewportSize({ width: w, height: h });
      await open(page, state, true);
      await expect(page.getByTestId("host-bar")).toBeVisible();
      const fit = await page.evaluate(() => ({ sh: document.scrollingElement!.scrollHeight, ih: window.innerHeight, oh: (document.querySelector("[data-testid=tv]") as HTMLElement).scrollHeight }));
      if (SHOTS) await page.screenshot({ path: `${SHOTS}/host-${state}-${w}x${h}.png` });
      expect(fit.sh).toBeLessThanOrEqual(fit.ih);
      expect(fit.oh).toBeLessThanOrEqual(fit.ih);
      if (state === "waiting") await expect(page.getByTestId("start")).toBeVisible();
      if (state === "results") await expect(page.getByTestId("next-now")).toBeVisible();
      if (state === "round") {
        const sizes = await page.locator("[data-testid=tv-round] [role=listitem]").evaluateAll((els) => els.map((e) => parseFloat(getComputedStyle(e).fontSize)));
        expect(sizes.length).toBe(4);
        for (const px of sizes) expect(px).toBeGreaterThanOrEqual(64);
        for (const c of await page.locator("[data-testid=tv-round] [role=listitem]").all()) await expect(c).toBeInViewport({ ratio: 1 });
      }
      for (const id of ["ready", "hud"]) await expect(page.getByTestId(id)).toHaveCount(0);
    });
  }
}

for (const [w, h] of [[1920, 1080], [1280, 720]] as const) {
  test(`host screen round keeps 4 long answers whole at ${w}x${h}`, async ({ page }) => {
    await page.setViewportSize({ width: w, height: h });
    await open(page, "round", true, true);
    const panel = (await page.getByTestId("tv-round").boundingBox())!;
    if (SHOTS) await page.screenshot({ path: `${SHOTS}/host-round-long-${w}x${h}.png` });
    const items = page.locator("[data-testid=tv-round] [role=listitem]");
    expect(await items.count()).toBe(4);
    for (const item of await items.all()) {
      const box = (await item.boundingBox())!;
      expect(box.y).toBeGreaterThanOrEqual(panel.y);
      expect(box.y + box.height).toBeLessThanOrEqual(panel.y + panel.height);
      expect(box.x + box.width).toBeLessThanOrEqual(panel.x + panel.width);
      const m = await item.evaluate((e) => {
        const range = document.createRange();
        range.selectNodeContents(e);
        const text = range.getBoundingClientRect();
        const box = e.getBoundingClientRect();
        return { top: text.top - box.top, bottom: box.bottom - text.bottom, left: text.left - box.left, right: box.right - text.right, px: parseFloat(getComputedStyle(e).fontSize) };
      });
      expect(m).toEqual(expect.objectContaining({ top: expect.any(Number) }));
      for (const [side, gap] of Object.entries(m)) if (side !== "px") expect(gap, `${side}`).toBeGreaterThanOrEqual(0);
      expect(m.px).toBeGreaterThanOrEqual(64);
    }
  });
}
