import { expect, test, type Page } from "@playwright/test";

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
