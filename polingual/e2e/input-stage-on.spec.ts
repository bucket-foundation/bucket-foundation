import { expect, test } from "@playwright/test";
import { mockApi, seeded, signIn } from "./mock";

const KNOWN = ["eight", "five", "four", "half", "hundred", "nine", "number", "one", "seven", "six", "ten", "thousand", "three"];
const WORDS = ["ocho", "cinco", "cuatro", "mitad", "cien", "nueve", "número", "uno", "siete", "seis", "diez", "mil", "tres"];
const TARGETS = ["cero", "negro"];

function bundle() {
  const sentences = [WORDS.slice(0, 10), [...WORDS.slice(3, 12), TARGETS[0]], [...WORDS.slice(1, 11)], [...WORDS.slice(2, 11), TARGETS[1], WORDS[12]]];
  const items = sentences.map((ws, k) => ({ id: `tatoeba:es:${900 + k}`, kind: "sentence", lang: "es", lemmas: Array.from(new Set(ws)), tokens: ws.map((w) => ({ surface: w, lemma: w })), text: ws.join(" "), translation: `sentence ${k + 1}` }));
  return { format: "polingual-input", version: 1, lang: "es", items, units: [{ id: "set:es:numbers", kind: "sentence_set", itemIds: items.map((i) => i.id), targetLemmas: TARGETS, tokenCount: items.reduce((n, i) => n + i.tokens.length, 0) }] };
}

function knownMemory() {
  const now = Date.now();
  const cards = Object.fromEntries(KNOWN.map((id) => [`es:${id}`, { state: "review", stability: 365, difficulty: 4, lastReview: now, due: now + 365 * 86_400_000, reps: 6, lapses: 0, introduced: "2026-01-01" }]));
  return { lang: "es", baseline: { cards, prof: {} }, log: [], migrated: "v1" };
}

test.skip(process.env.NEXT_PUBLIC_POLINGUAL_INPUT_STAGE === "demo" || process.env.NEXT_PUBLIC_POLINGUAL_INPUT_STAGE === "0", "runs in the default on mode");

test("a learner who knows the words reaches an eligible unit without the demo flag", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  const branches = seeded();
  branches["lang-es"] = { data: knownMemory(), updated_at: new Date().toISOString() };
  await mockApi(page, { branches });
  await page.route("**/input/manifest.json", (route) => route.fulfill({ json: { format: "polingual-input", langs: { es: { file: "es.0123456789ab.json" } } } }));
  await page.route("**/input/es.0123456789ab.json", (route) => route.fulfill({ json: bundle() }));
  await signIn(page);
  await page.goto("/app/en-es-fr/study");
  await expect(page.getByTestId("session").or(page.getByTestId("input-stage"))).toBeVisible({ timeout: 60_000 });
  let reached = false;
  for (let n = 0; n < 80 && !reached; n++) {
    reached = await page.getByTestId("input-stage").isVisible();
    if (reached) break;
    if (await page.getByTestId("session-done").isVisible()) break;
    const skip = page.getByTestId("skip-exercise");
    if (await skip.isVisible().catch(() => false)) await skip.click({ timeout: 2000 }).catch(() => undefined);
    await page.waitForTimeout(60);
  }
  expect(reached, "the input stage appears in on mode").toBe(true);
  await expect(page.getByTestId("input-stage")).toHaveAttribute("data-unit", "set:es:numbers");
  await expect(page.getByTestId("input-glosses")).toContainText("cero");
});
