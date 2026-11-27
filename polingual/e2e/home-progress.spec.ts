import { expect, test } from "@playwright/test";
import { mockApi, signIn } from "./mock";

const SHOTS = process.env.PL_SHOTS_DIR;
const DAY = 86_400_000;

function langBranch(now: number) {
  const base = { device_id: "d", tz: "UTC", system_id: "en-es-fr" };
  const card = (days: number) => ({ state: "review", stability: 60, difficulty: 5, lastReview: now - days * DAY, due: now + 30 * DAY, reps: 4, lapses: 0 });
  const cards = Object.fromEntries(["casa", "perro", "gato", "agua", "libro", "mesa", "sol"].map((w, i) => [`es:${w}`, card(i % 3)]));
  return {
    lang: "es",
    migrated: "v1",
    baseline: { cards, prof: {}, settings: { newPerDay: 4, requestRetention: 0.9 }, stats: { xp: 0, streak: 0, lastStudyDay: null, history: {} } },
    log: [
      { ...base, kind: "session", review_id: "s1", reviewed_at: now - 60_000, lang: "es", id: "s1", started: now - 3_600_000, ended: now - 60_000, share_target: 0.7, share_real: 0.7, arm: null, units: 2, cards: 4 },
      { ...base, kind: "exposure", review_id: "e1", reviewed_at: now - 3_000_000, lang: "es", item: "v1", unit: "v1/1", lemmas_seen: ["casa"], taps: [], seconds: 2400, coverage_pred: 0.94, completed: true },
      { ...base, kind: "exposure", review_id: "e2", reviewed_at: now - 2_000_000, lang: "es", item: "v1", unit: "v1/2", lemmas_seen: [], taps: [], seconds: 2100, coverage_pred: 0.91, completed: true },
    ],
  };
}

for (const width of [390, 1440]) {
  test(`home shows input hours and known words per language at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: width > 500 ? 900 : 844 });
    const now = Date.now();
    const at = new Date().toISOString();
    await mockApi(page, {
      branches: {
        "lang-systems": { updated_at: at, data: { systems: [{ id: "en-es-fr", name: "Romance", root: "en", targets: ["es", "fr"], createdAt: 1, placement: {}, levels: {} }], removed: {} } },
        "lang-es": { updated_at: at, data: langBranch(now) },
      },
    });
    await signIn(page);
    const rows = page.getByTestId("lang-progress-row");
    await expect(rows).toHaveCount(2);
    await expect(rows.nth(0).getByTestId("input-hours")).toHaveText("1.2 h input");
    await expect(rows.nth(0).getByTestId("known-words")).toHaveText("7 known words");
    await expect(rows.nth(1).getByTestId("input-hours")).toHaveText("0.0 h input");
    await expect(page.getByTestId("streak-day")).toHaveText("Day 1 of 100");
    const sw = await page.evaluate(() => document.documentElement.scrollWidth);
    expect(sw).toBeLessThanOrEqual(width);
    if (SHOTS) await page.screenshot({ path: `${SHOTS}/home-progress-${width}.png`, fullPage: true });
  });
}
