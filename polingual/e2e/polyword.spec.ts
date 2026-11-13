import { expect, test, type Page } from "@playwright/test";
import { buildBank } from "../src/lib/polyword/bank";
import { puzzleFor } from "../src/lib/polyword/puzzle";
import { WORDS } from "../src/lib/words";
import { mockApi, signIn } from "./mock";

const SHOTS = process.env.PL_SHOTS_DIR;
const ADS_ON = !!process.env.NEXT_PUBLIC_POLINGUAL_ADS && process.env.NEXT_PUBLIC_POLINGUAL_ADS !== "off";
const NOW = new Date(2026, 10, 13, 10, 0, 0);
const TODAY = 13;
const bank = buildBank(WORDS);
const es = puzzleFor(bank, "es", TODAY)!;
const KEY = "polingual-web/polyword/v1";

const WIDTHS = [
  { name: "phone", width: 390, height: 844 },
  { name: "desktop", width: 1440, height: 900 },
];

function wrong(answer: string): string[] {
  const pool = "qxzjkwvbfhmy";
  return Array.from({ length: 6 }, (_, r) =>
    Array.from({ length: answer.length }, (_, i) => pool[(r * 2 + i) % pool.length])
      .join("")
      .replace(/./g, (c, i) => (c === answer[i] ? "y" : c)),
  );
}

async function open(page: Page, progress?: unknown) {
  await page.clock.setFixedTime(NOW);
  await page.route("**/api/academy/**", (r) => r.fulfill({ status: 401, json: { error: "unauthorized" } }));
  if (progress) await page.addInitScript(([k, v]) => window.localStorage.setItem(k as string, v as string), [KEY, JSON.stringify(progress)]);
  await page.goto("/play/polyword");
  await expect(page.getByTestId("pw-board")).toBeVisible();
}

async function type(page: Page, word: string) {
  await page.keyboard.type(word);
  await page.keyboard.press("Enter");
}

async function shot(page: Page, name: string) {
  if (!SHOTS) return;
  await page.waitForTimeout(1500);
  await page.screenshot({ path: `${SHOTS}/${name}.png`, fullPage: true });
}

for (const vp of WIDTHS) {
  test.describe(`${vp.name} ${vp.width}`, () => {
    test.use({ viewport: { width: vp.width, height: vp.height } });

    test("a miss opens a clue, a win shows the result, share and sign-in CTAs", async ({ page }) => {
      await open(page);
      await expect(page.getByTestId("pw-row")).toHaveCount(6);
      await expect(page.getByTestId("ad-rail-left")).toHaveCount(0);
      await expect(page.getByTestId("ad-banner")).toHaveCount(0);
      const guess = wrong(es.answer)[0];
      for (const ch of guess) await page.getByTestId(`pw-key-${ch}`).click();
      await shot(page, `polyword-${vp.name}-typing`);
      await page.getByTestId("pw-enter").click();
      await expect(page.getByTestId("pw-hint")).toHaveCount(1);
      await expect(page.getByTestId("pw-toast")).toContainText("New clue");
      await type(page, es.answer.slice(0, -1));
      await expect(page.getByTestId("pw-toast")).toContainText(`Use ${es.answer.length} letters`);
      await type(page, es.answer.slice(-1));
      await expect(page.getByTestId("pw-results")).toBeVisible();
      await expect(page.getByTestId("pw-results")).toHaveAttribute("data-won", "true");
      await expect(page.getByTestId("pw-hint")).toHaveCount(es.hints.length);
      await expect(page.getByTestId("pw-streak")).toContainText("1");
      await expect(page.getByTestId("pw-cta-start")).toHaveText("Start learning");
      await expect(page.getByTestId("pw-cta-sign-in")).toHaveText("Sign in");
      await expect(page.getByTestId("pw-ad-results")).toHaveCount(0);
      await expect(page.getByTestId("ad-rail-left")).toHaveCount(0);
      await page.context().grantPermissions(["clipboard-read", "clipboard-write"]);
      await page.getByTestId("pw-share").click();
      const text = await page.evaluate(() => navigator.clipboard.readText());
      expect(text.split("\n")[0]).toBe("Polyword 🇪🇸 #13 2/6");
      expect(text).toContain("🇬🇧");
      await shot(page, `polyword-${vp.name}-won`);
      const width = await page.evaluate(() => document.documentElement.scrollWidth);
      expect(width).toBeLessThanOrEqual(vp.width);
    });

    test("six misses lose and show the answer with every clue", async ({ page }) => {
      await open(page);
      for (const g of wrong(es.answer)) await type(page, g);
      await expect(page.getByTestId("pw-results")).toHaveAttribute("data-won", "false");
      await expect(page.getByTestId("reveal-entry")).toContainText(es.word);
      await expect(page.getByTestId("pw-streak")).toContainText("0");
    });

    test("after the first game, free players see ads around results and none during play", async ({ page }) => {
      test.skip(!ADS_ON, "needs NEXT_PUBLIC_POLINGUAL_ADS");
      await open(page, { v: 1, games: { fr: { "12": { guesses: ["aaaaa"], done: true, won: true } } }, unlocked: {}, first: "fr:12" });
      await expect(page.getByTestId("polyword")).toHaveAttribute("data-account", "signed-out");
      await expect(page.getByTestId("ad-rail-left")).toHaveCount(0);
      await expect(page.getByTestId("ad-banner")).toHaveCount(0);
      await type(page, es.answer);
      await expect(page.getByTestId("pw-ad-results")).toBeVisible();
      if (vp.width >= 1000) await expect(page.getByTestId("ad-rail-left")).toBeVisible();
      else await expect(page.getByTestId("ad-banner")).toBeVisible();
      await shot(page, `polyword-${vp.name}-results-ads`);
    });

    test("a past puzzle opens after a rewarded ad", async ({ page }) => {
      test.skip(!ADS_ON, "needs NEXT_PUBLIC_POLINGUAL_ADS");
      await open(page);
      await page.getByTestId("pw-archive-open").click();
      await expect(page.getByTestId("pw-day-12")).toHaveAttribute("data-state", "locked");
      await shot(page, `polyword-${vp.name}-archive`);
      await page.getByTestId("pw-day-12").click();
      await expect(page.getByTestId("pw-watch")).toBeVisible();
      await expect(page.getByTestId("pw-pro")).toHaveAttribute("href", "/app?from=polyword-archive");
      await shot(page, `polyword-${vp.name}-unlock`);
      await page.getByTestId("pw-watch").click();
      await expect(page.getByTestId("pw-ad-reward")).toBeVisible();
      await expect(page.getByTestId("pw-unlock")).toHaveCount(0, { timeout: 12_000 });
      await expect(page.getByTestId("polyword")).toContainText("#12");
      await page.getByTestId("pw-archive-open").click();
      await expect(page.getByTestId("pw-day-12")).toHaveAttribute("data-state", "open");
    });

    test("with ads off a past puzzle offers Pro only", async ({ page }) => {
      test.skip(ADS_ON, "ads flag set");
      await open(page);
      await page.getByTestId("pw-archive-open").click();
      await page.getByTestId("pw-day-12").click();
      await expect(page.getByTestId("pw-watch")).toHaveCount(0);
      await expect(page.getByTestId("pw-pro")).toBeVisible();
    });
  });
}

test.describe("accounts", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test("a subscriber gets Continue learning, no ads and the open archive", async ({ page }) => {
    await page.clock.setFixedTime(NOW);
    await mockApi(page, { entitled: true });
    await signIn(page);
    await expect(page.getByTestId("sign-out")).toBeVisible();
    await page.goto("/play/polyword");
    await expect(page.getByTestId("polyword")).toHaveAttribute("data-account", "paid");
    await type(page, es.answer);
    await expect(page.getByTestId("pw-cta-continue")).toHaveText("Continue learning");
    await expect(page.getByTestId("pw-cta-sign-in")).toHaveCount(0);
    await expect(page.getByTestId("pw-ad-results")).toHaveCount(0);
    await expect(page.getByTestId("ad-banner")).toHaveCount(0);
    await page.getByTestId("pw-archive-open").click();
    await expect(page.getByTestId("pw-day-3")).toHaveAttribute("data-state", "open");
    await page.getByTestId("pw-day-3").click();
    await expect(page.getByTestId("polyword")).toContainText("#3");
  });

  test("a free account gets Start learning only", async ({ page }) => {
    await page.clock.setFixedTime(NOW);
    await mockApi(page, { entitled: false });
    await signIn(page);
    await expect(page.getByTestId("sign-out")).toBeVisible();
    await page.goto("/play/polyword");
    await expect(page.getByTestId("polyword")).toHaveAttribute("data-account", "free");
    await type(page, es.answer);
    await expect(page.getByTestId("pw-cta-start")).toBeVisible();
    await expect(page.getByTestId("pw-cta-sign-in")).toHaveCount(0);
  });

  test("an open page moves to the new word after midnight", async ({ page }) => {
    await page.clock.setFixedTime(new Date(2026, 10, 12, 23, 59, 0));
    await page.route("**/api/academy/**", (r) => r.fulfill({ status: 401, json: { error: "unauthorized" } }));
    await page.goto("/play/polyword");
    await expect(page.getByTestId("polyword")).toContainText("#12");
    await page.clock.setFixedTime(NOW);
    await page.evaluate(() => document.dispatchEvent(new Event("visibilitychange")));
    await expect(page.getByTestId("polyword")).toContainText("#13 · Today");
    await type(page, es.answer);
    await expect(page.getByTestId("pw-streak")).toContainText("1");
  });

  test("the lobby page links to Polyword", async ({ page }) => {
    await page.route("**/api/academy/**", (r) => r.fulfill({ status: 401, json: { error: "unauthorized" } }));
    await page.goto("/play");
    await page.getByTestId("polyword-link").click();
    await expect(page).toHaveURL(/\/play\/polyword$/);
  });
});
