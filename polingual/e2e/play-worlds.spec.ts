import { expect, test, type Page } from "@playwright/test";
import { SPY_SCENES } from "../../src/lib/academy/ispy";

const TILES = [
  { lang: "es", form: "agua", meaning: "water", itemId: "a" },
  { lang: "fr", form: "pain", meaning: "bread", itemId: "b" },
  { lang: "de", form: "Haus", meaning: "house", itemId: "c" },
  { lang: "it", form: "sole", meaning: "sun", itemId: "d" },
];
const GHOSTS = [{ name: "Mateo", flag: "ES", skill: "medium", score: 4 }];

async function solo(page: Page) {
  await page.route("**/api/academy/flag-tiles**", (r) => r.fulfill({ json: { deck: { date: "2026-11-13", langs: ["es", "fr", "de", "it"], tiles: TILES }, ghosts: GHOSTS } }));
  await page.route("**/api/academy/voice-atlas**", (r) => r.fulfill({ json: { date: "2026-11-13", rounds: TILES, ghosts: GHOSTS } }));
  await page.route("**/play/roots", (r) => r.fulfill({ json: { "es:agua": { slug: "water", roots: [{ root: "Latin aqua", langs: ["es"] }] } } }));
}

for (const width of [390, 1440, 1920]) {
  test.describe(`play worlds at ${width}`, () => {
    test.use({ viewport: { width, height: width === 390 ? 844 : width === 1920 ? 1080 : 900 } });

    test("hub cards preview every world", async ({ page }) => {
      await page.goto("/play");
      await expect(page.getByTestId("game-hub").locator("li")).toHaveCount(12, { timeout: 60_000 });
    });

    test("Voice Atlas shows the word reveal only after the pin locks", async ({ page }) => {
      await solo(page);
      await page.goto("/play/voice-atlas");
      await expect(page.locator("[data-round=active]")).toBeVisible({ timeout: 60_000 });
      await expect(page.getByTestId("word-reveal")).toHaveCount(0);
      await expect(page.getByTestId("reveal-entry")).toHaveCount(0);
      const map = page.getByTestId("va-map");
      const box = await map.boundingBox();
      if (!box) throw new Error("no map");
      await page.mouse.click(box.x + box.width * 0.48, box.y + box.height * 0.3);
      await page.getByTestId("va-lock").click();
      await expect(page.getByTestId("word-reveal")).toBeVisible();
      await expect(page.getByTestId("reveal-root")).toHaveText("Latin aqua");
      await expect(page.getByTestId("reveal-learn")).toHaveAttribute("href", "/word/water?from=play");
      await expect(page.locator("[data-round=active]")).toHaveCount(0);
    });

    test("Flag Tiles hides the reveal while a word falls and shows it on results", async ({ page }) => {
      await solo(page);
      await page.goto("/play/flag-tiles");
      await page.getByTestId("ft-start").click();
      await expect(page.getByTestId("ft-stage")).toBeVisible();
      await expect(page.getByTestId("word-reveal")).toHaveCount(0);
      await expect(page.getByTestId("reveal-entry")).toHaveCount(0);
      const word = await page.getByTestId("ft-word").innerText();
      const wrong = TILES.findIndex((t) => t.form !== word.trim());
      await page.getByTestId("ft-lane").nth(wrong).dispatchEvent("pointerdown");
      await expect(page.getByTestId("word-reveal")).toBeVisible();
      await page.getByTestId("ft-end").click();
      await expect(page.getByTestId("learn-panel")).toBeVisible();
      await expect(page.getByTestId("results-start-learning")).toHaveAttribute("href", "/app?from=play");
    });
  });
}

const MEANINGS = ["cold", "bag", "grass", "clothes", "bread", "water", "house", "sun"].map((m, i) => ({ id: `m${i}`, meaning: m, forms: { es: `${m}es`, fr: `${m}fr`, it: `${m}it` } }));
const CARDS = TILES.map((t) => ({ ...t, reading: null }));

async function soloRound(page: Page) {
  await page.route("**/api/academy/word-snake**", (r) => r.fulfill({ json: { deck: { lang: "es", good: TILES.map(({ lang, form, meaning }) => ({ lang, form, meaning })), decoys: [] } } }));
  await page.route("**/api/academy/forehead**", (r) => r.fulfill({ json: { cards: CARDS } }));
  await page.route("**/api/academy/babel**", (r) => r.fulfill({ json: { meanings: MEANINGS } }));
  await page.route("**/api/academy/shift**", (r) => r.fulfill({ json: { board: { date: "2026-11-13", langs: ["it"], length: 3, columns: [["s", "a"], ["o", "b"], ["l", "c"]], targets: [{ lang: "it", form: "abc", meaning: "test" }], valid: { abc: ["it"] } } } }));
}

const ROUND_PAGES: [string, string, ((p: Page) => Promise<void>) | null][] = [
  ["word-snake", "ws-canvas", async (p) => { await p.locator("button", { hasText: /^(Start|Play)/ }).first().click(); }],
  ["forehead", "fh-play", async (p) => { await p.getByTestId("fh-start").click(); }],
  ["babel-match", "bm-board", null],
  ["shift", "sh-board", null],
  ["polyword", "pw-board", null],
];

test.describe("solo rounds keep the reveal hidden", () => {
  test.use({ viewport: { width: 390, height: 844 } });
  for (const [slug, surface, start] of ROUND_PAGES) {
    test(slug, async ({ page }) => {
      await soloRound(page);
      await page.goto(`/play/${slug}`);
      if (start) await start(page);
      await expect(page.getByTestId(surface)).toBeVisible({ timeout: 60_000 });
      for (const id of ["reveal-entry", "word-reveal", "learn-panel"]) await expect(page.getByTestId(id)).toHaveCount(0);
    });
  }

  test("ispy", async ({ page }) => {
    const scene = SPY_SCENES[0];
    const ids = scene.objects.map((o) => o.id);
    const rounds = [0, 1].map((i) => ({ round: i, scene: scene.id, lang: "es", item_id: `i${i}`, mode: "spy", gloss: `cosa${i}`, choices: ids, answer: ids[i], reveal: [{ lang: "es", word: `cosa${i}`, roman: null, reading: null, meaning: "thing", gloss: "thing", correct: true }] }));
    await page.route("**/api/academy/ispy**", (r) => r.fulfill({ json: { rounds } }));
    await page.goto("/play/ispy");
    await page.getByTestId("ispy-start").click();
    const room = page.getByTestId("ispy-room");
    await expect(room).toHaveAttribute("data-round", "active", { timeout: 60_000 });
    await expect(page.getByTestId("spy-reveal")).toHaveCount(0);
    await expect(page.getByTestId("reveal-entry")).toHaveCount(0);
  });
});
