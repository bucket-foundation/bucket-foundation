import { readFileSync } from "node:fs";
import { join } from "node:path";
import { expect, test, type Locator, type Page } from "@playwright/test";
import { mockApi, seeded, signIn } from "./mock";

const SHOTS = process.env.PL_SHOTS_DIR;

test.skip(process.env.NEXT_PUBLIC_POLINGUAL_INPUT_STAGE !== "demo", "needs the dev server started with NEXT_PUBLIC_POLINGUAL_INPUT_STAGE=demo, since a seeded beginner passes the gloss budget nowhere");
const RAW = JSON.parse(readFileSync(join(__dirname, "../../scripts/fixtures/polingual-input/es.json"), "utf8")) as { items: { translationSource?: string }[] };
RAW.items.forEach((i) => {
  i.translationSource = "machine";
});
const FIXTURE = JSON.stringify(RAW);

async function mockInput(page: Page, present = true): Promise<void> {
  await page.route("**/input/manifest.json", (route) => (present ? route.fulfill({ json: { format: "polingual-input", langs: { es: { file: "es.0123456789ab.json" } } } }) : route.fulfill({ status: 404, body: "missing" })));
  await page.route("**/input/es.0123456789ab.json", (route) => route.fulfill({ body: FIXTURE, contentType: "application/json" }));
}

const PLAYER = `<html><body>clip<script>setTimeout(() => parent.postMessage(JSON.stringify({ event: "onStateChange", info: 1 }), "*"), 100);</script></body></html>`;

async function open(page: Page, width: number, present = true): Promise<void> {
  await page.route("**/youtube-nocookie.com/**", (route) => route.fulfill({ body: PLAYER, contentType: "text/html" }));
  await page.setViewportSize({ width, height: width > 500 ? 900 : 844 });
  await mockApi(page, { branches: seeded() });
  await mockInput(page, present);
  await signIn(page);
  await page.goto("/app/en-es-fr/study");
  await expect(page.getByTestId("session").or(page.getByTestId("input-stage"))).toBeVisible({ timeout: 60_000 });
}

async function reachStage(page: Page): Promise<boolean> {
  for (let n = 0; n < 80; n++) {
    if (await page.getByTestId("input-stage").isVisible()) return true;
    if (await page.getByTestId("session-done").isVisible()) return false;
    const skip = page.getByTestId("skip-exercise");
    if (await skip.isVisible().catch(() => false)) await skip.click({ timeout: 2000 }).catch(() => undefined);
    await page.waitForTimeout(60);
  }
  return false;
}

async function fullyClickable(page: Page, el: Locator): Promise<void> {
  const box = await el.boundingBox();
  expect(box).not.toBeNull();
  const vp = page.viewportSize()!;
  expect(box!.y + box!.height).toBeLessThanOrEqual(vp.height);
  const hit = await el.evaluate((node) => {
    const r = node.getBoundingClientRect();
    const cx = (r.left + r.right) / 2, cy = (r.top + r.bottom) / 2, inset = Math.min(r.height / 2, r.width / 4);
    const pts = [[cx, r.top + 3], [cx, r.bottom - 3], [r.left + inset, cy], [r.right - inset, cy]];
    return pts.map(([x, y]) => { const e = document.elementFromPoint(x, y); return node.contains(e) ? "ok" : `${(e as HTMLElement | null)?.tagName}.${(e as HTMLElement | null)?.className}`; });
  });
  expect(hit, "nothing covers the button").toEqual(["ok", "ok", "ok", "ok"]);
}

const pending = (page: Page) =>
  page.evaluate(() => {
    const k = Object.keys(localStorage).find((x) => x.endsWith("/outbox/learn-batch"));
    return k ? (JSON.parse(localStorage.getItem(k) ?? "[]") as { kind: string; taps: string[]; revealed?: boolean; seconds: number }[]) : [];
  });

for (const width of [390, 1440]) {
  test(`the input stage glosses first, hides meanings, logs taps and reveals at ${width}px`, async ({ page }) => {
    await open(page, width);
    expect(await reachStage(page)).toBe(true);
    await fullyClickable(page, page.getByTestId("input-start"));
    if (SHOTS) await page.screenshot({ path: `${SHOTS}/input-stage-gloss-${width}.png` });
    await page.getByTestId("input-start").click();
    await expect(page.getByTestId("input-video-poster")).toBeVisible();
    await expect(page.getByTestId("input-video")).toHaveCount(0);
    await expect(page.getByTestId("input-video-fallback")).toBeVisible();
    await expect(page.getByTestId("input-translation")).toHaveCount(0);
    await page.getByTestId("input-reveal").first().click();
    await expect(page.getByTestId("input-translation")).toHaveCount(1);
    await expect(page.getByTestId("input-machine-label")).toHaveText(/machine translation/);
    const tokens = page.getByTestId("input-token");
    await tokens.nth(1).click();
    await expect(tokens.nth(1)).toHaveAttribute("aria-pressed", "true");
    await fullyClickable(page, page.getByTestId("input-done"));
    await page.getByTestId("input-video-poster").click();
    await expect(page.getByTestId("input-video")).toBeVisible();
    await page.waitForTimeout(3200);
    if (SHOTS) await page.screenshot({ path: `${SHOTS}/input-stage-read-${width}.png` });
    await page.getByTestId("input-done").click();
    await expect(page.getByTestId("input-stage")).toBeHidden();
    const rows = (await pending(page)).filter((r) => r.kind === "exposure");
    expect(rows.length).toBeGreaterThan(0);
    expect(rows.some((r) => r.taps.length === 1)).toBe(true);
    expect(rows.some((r) => r.revealed === true)).toBe(true);
    expect(rows.every((r) => r.seconds >= 0 && r.seconds <= 3600)).toBe(true);
  });
}

test("the poster loads the YouTube clip only after a click", async ({ page }) => {
  await open(page, 1440);
  expect(await reachStage(page)).toBe(true);
  await page.getByTestId("input-start").click();
  await expect(page.getByTestId("input-video")).toHaveCount(0);
  await page.getByTestId("input-video-poster").click();
  await expect(page.getByTestId("input-video")).toHaveAttribute("src", /youtube-nocookie\.com\/embed\//);
});

test("skip logs nothing as seen", async ({ page }) => {
  await open(page, 1440);
  expect(await reachStage(page)).toBe(true);
  await page.getByTestId("input-start").click();
  await page.getByTestId("input-skip").click();
  await expect(page.getByTestId("input-stage")).toBeHidden();
  expect((await pending(page)).filter((r) => r.kind === "exposure")).toHaveLength(0);
});

test("a missing bundle skips the stage and the session goes on", async ({ page }) => {
  await open(page, 1440, false);
  expect(await reachStage(page)).toBe(false);
  await expect(page.getByTestId("session-done").or(page.getByTestId("session"))).toBeVisible();
});
