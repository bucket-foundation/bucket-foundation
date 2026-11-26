import { readFileSync } from "node:fs";
import { join } from "node:path";
import { expect, test, type Page } from "@playwright/test";
import { mockApi, seeded, signIn } from "./mock";

const SHOTS = process.env.PL_SHOTS_DIR;
const FIXTURE = readFileSync(join(__dirname, "../../scripts/fixtures/polingual-input/es.json"), "utf8");

async function mockInput(page: Page): Promise<void> {
  await page.route("**/input/manifest.json", (route) => route.fulfill({ json: { format: "polingual-input", langs: { es: { file: "es.0123456789ab.json" } } } }));
  await page.route("**/input/es.0123456789ab.json", (route) => route.fulfill({ body: FIXTURE, contentType: "application/json" }));
}

async function reachStage(page: Page): Promise<void> {
  await expect(page.getByTestId("session").or(page.getByTestId("input-stage"))).toBeVisible({ timeout: 60_000 });
  for (let n = 0; n < 80 && !(await page.getByTestId("input-stage").isVisible()); n++) {
    const skip = page.getByTestId("skip-exercise");
    if (await skip.isVisible().catch(() => false)) await skip.click({ timeout: 2000 }).catch(() => undefined);
    await page.waitForTimeout(60);
  }
  await expect(page.getByTestId("input-stage")).toBeVisible();
}

for (const width of [390, 1440]) {
  test(`the input stage shows glosses, takes taps and hands back to the session at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: width > 500 ? 900 : 844 });
    await mockApi(page, { branches: seeded() });
    await mockInput(page);
    await signIn(page);
    await page.goto("/app/en-es-fr/study");
    await reachStage(page);
    await expect(page.getByTestId("input-start")).toBeVisible();
    if (SHOTS) await page.screenshot({ path: `${SHOTS}/input-stage-gloss-${width}.png`, fullPage: true });
    await page.getByTestId("input-start").click();
    const tokens = page.getByTestId("input-token");
    await expect(tokens.first()).toBeVisible();
    await tokens.nth(1).click();
    await expect(tokens.nth(1)).toHaveAttribute("aria-pressed", "true");
    if (SHOTS) await page.screenshot({ path: `${SHOTS}/input-stage-read-${width}.png`, fullPage: true });
    const log = await page.evaluate(() => Object.keys(localStorage).length);
    expect(log).toBeGreaterThan(0);
    await page.getByTestId("input-done").click();
    await expect(page.getByTestId("input-stage")).toBeHidden();
    const pending = await page.evaluate(() => {
      const k = Object.keys(localStorage).find((x) => x.endsWith("/outbox/learn-batch"));
      return k ? (JSON.parse(localStorage.getItem(k) ?? "[]") as { kind: string; taps: string[] }[]) : [];
    });
    expect(pending.filter((r) => r.kind === "exposure").length).toBeGreaterThan(0);
    expect(pending.some((r) => r.taps.length === 1)).toBe(true);
  });
}
