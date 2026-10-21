import { test, expect, type Page } from "@playwright/test";
import { nextCard } from "../../src/lib/brand-pick/schedule";
import type { Answer } from "../../src/lib/brand-pick/answers";

const PATH = "/brand/pick";
const STORE = "bucket.brand-pick.v1";
const SHOTS = process.env.E2E_SHOTS || "test-results/brand-pick";
const MAIL = process.env.E2E_MAIL_URL || "http://127.0.0.1:54324";

async function codeFor(address: string): Promise<string> {
  for (let i = 0; i < 40; i++) {
    const r = await fetch(`${MAIL}/api/v1/messages?limit=20`);
    if (r.ok) {
      const j = (await r.json()) as { messages?: { ID: string; To?: { Address: string }[] }[] };
      const m = (j.messages ?? []).find((x) => (x.To ?? []).some((t) => t.Address === address));
      if (m) {
        const d = (await (await fetch(`${MAIL}/api/v1/message/${m.ID}`)).json()) as { Text?: string; HTML?: string };
        const hit = ((d.Text ?? "") + " " + (d.HTML ?? "")).match(/\b(\d{6})\b/);
        if (hit) return hit[1];
      }
    }
    await new Promise((res) => setTimeout(res, 1500));
  }
  throw new Error("no sign-in code arrived");
}

async function answeredCount(page: Page): Promise<number> {
  const text = (await page.getByTestId("progress-count").textContent()) ?? "";
  return Number(text.trim().split(" ")[0]);
}

async function noSideScroll(page: Page) {
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
}

function answersUntil(seed: number, aspect: Answer["aspect"]): Answer[] {
  const out: Answer[] = [];
  for (let i = 0; i < 500; i++) {
    const c = nextCard(seed, out)!;
    if (c.aspect === aspect) return out;
    out.push({ aspect: c.aspect, a: c.a, b: c.b, round: c.round, left: c.left, choice: c.a, note: i === 0 ? "first note" : "", at: new Date(Date.UTC(2026, 9, 20, 0, 0, i)).toISOString() });
  }
  throw new Error("aspect not reached");
}

test("the page is unlisted", async ({ page, request }) => {
  const res = await request.get(PATH);
  expect(res.status()).toBe(200);
  expect(res.headers()["x-robots-tag"]).toContain("noindex");
  await page.goto(PATH);
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);
  const robots = await (await request.get("/robots.txt")).text();
  expect(robots).toContain("Disallow: /brand/");
  await page.goto("/");
  await expect(page.locator(`a[href="${PATH}"]`)).toHaveCount(0);
});

for (const [label, viewport] of [["web", { width: 1280, height: 860 }], ["mobile", { width: 390, height: 844 }]] as const) {
  test.describe(`${label} width`, () => {
    test.use({ viewport });

    test("a guest picks with keys and buttons, skips, writes an optional note, resumes and sees results", async ({ page }) => {
      await page.goto(PATH);
      await page.evaluate((k) => localStorage.removeItem(k), STORE);
      await page.reload();
      const quiz = page.getByTestId("brand-pick");
      await expect(quiz.getByTestId("choice-1")).toBeVisible();
      await expect(quiz.getByTestId("choice-2")).toBeVisible();
      await expect(quiz.getByText("Saved on this device", { exact: false })).toBeVisible();
      await expect(quiz.getByTestId("choice-1").locator("img").first()).toHaveJSProperty("complete", true);
      expect(await quiz.getByTestId("choice-1").locator("img").first().evaluate((i: HTMLImageElement) => i.naturalWidth)).toBeGreaterThan(0);
      await noSideScroll(page);
      await page.screenshot({ path: `${SHOTS}/card-${label}.png`, fullPage: true });

      expect(await answeredCount(page)).toBe(0);
      await page.keyboard.press("1");
      await expect.poll(() => answeredCount(page)).toBe(1);

      const second = await quiz.getByTestId("choice-2").getAttribute("data-direction");
      await page.locator("#pick-note").fill("the mark reads at small size");
      await page.keyboard.press("2");
      expect(await answeredCount(page)).toBe(1);
      await expect(page.locator("#pick-note")).toHaveValue("the mark reads at small size2");
      await page.locator("#pick-note").fill("the mark reads at small size");
      await quiz.getByTestId("choice-2").getByRole("button").click();
      await expect.poll(() => answeredCount(page)).toBe(2);
      await expect(page.locator("#pick-note")).toHaveValue("");

      await quiz.getByRole("button", { name: "skip" }).click();
      await expect.poll(() => answeredCount(page)).toBe(3);

      await page.reload();
      await expect.poll(() => answeredCount(page)).toBe(3);
      const stored = await page.evaluate((k) => JSON.parse(localStorage.getItem(k) || "{}"), STORE);
      expect(stored.answers).toHaveLength(3);
      expect(stored.answers.filter((a: Answer) => a.choice === null)).toHaveLength(1);
      expect(stored.answers.filter((a: Answer) => a.note === "")).toHaveLength(2);

      await page.getByRole("button", { name: "see results" }).click();
      const results = page.getByTestId("results");
      await expect(results.getByTestId("overall-row")).toHaveCount(7);
      await expect(results.getByTestId(`notes-${second}`)).toHaveText(/the mark reads at small size$/);
      await expect(results.getByTestId("share-summary")).toHaveValue(/Overall: 1\./);
      const download = page.waitForEvent("download");
      await results.getByRole("button", { name: "export json" }).click();
      expect((await download).suggestedFilename()).toMatch(/^bucket-brand-pick-\d{4}-\d{2}-\d{2}\.json$/);
      await noSideScroll(page);
      await page.screenshot({ path: `${SHOTS}/results-${label}.png`, fullPage: true });

      page.once("dialog", (d) => void d.accept());
      await results.getByRole("button", { name: "start over" }).click();
      await expect.poll(() => answeredCount(page)).toBe(0);
      await expect(quiz.getByTestId("choice-1")).toBeVisible();
    });

    test("the motion aspect plays the direction videos", async ({ page }) => {
      const seed = 1234;
      await page.goto(PATH);
      await page.evaluate(([k, v]) => localStorage.setItem(k, v), [STORE, JSON.stringify({ seed, answers: answersUntil(seed, "motion") })]);
      await page.reload();
      await expect(page.getByText("motion and video ·", { exact: false })).toBeVisible();
      const videos = page.getByTestId("brand-pick").locator("video");
      await expect(videos).toHaveCount(2);
      await expect.poll(() => videos.first().evaluate((v: HTMLVideoElement) => v.readyState)).toBeGreaterThan(0);
      await noSideScroll(page);
      await page.screenshot({ path: `${SHOTS}/motion-${label}.png`, fullPage: true });
    });
  });
}

test("a signed-in pick lands in the account and survives a fresh browser", async ({ page, browser }) => {
  const email = `e2e-brand-pick-${Date.now()}@bucket.local`;
  await page.goto(PATH);
  expect((await page.request.put("/api/brand/pick", { data: {} })).status()).toBe(401);
  await page.goto("/sign-in");
  await page.locator("#sign-in-email").fill(email);
  await page.getByRole("button", { name: "continue" }).click();
  await page.locator("#sign-in-code").fill(await codeFor(email));
  await page.getByRole("button", { name: "sign in", exact: true }).click();
  await page.waitForURL((u) => !u.pathname.startsWith("/sign-in"));
  await page.goto(PATH);
  await expect(page.getByText("Saved to your account.")).toBeVisible();
  await page.locator("#pick-note").fill("calmer");
  await page.keyboard.press("Tab");
  await page.getByTestId("choice-1").getByRole("button").click();
  await expect.poll(async () => {
    const r = await page.request.get("/api/brand/pick");
    const j = (await r.json()) as { answers: Answer[] };
    return j.answers.map((a) => a.note);
  }).toEqual(["calmer"]);
  expect((await page.request.put("/api/brand/pick", { data: { answers: [{ aspect: "logo", a: "d2", b: "d1", round: 0, left: "d1", choice: "d1" }] } })).status()).toBe(400);
  expect((await page.request.put("/api/brand/pick", { data: { aspect: "logo", a: "d1", b: "d2", round: 0, left: "d1", choice: "d1" } })).status()).toBe(400);

  const fresh = await browser.newContext({ storageState: { cookies: await page.context().cookies(), origins: [] } });
  const other = await fresh.newPage();
  await other.goto(PATH);
  await expect.poll(() => answeredCount(other)).toBe(1);
  await fresh.close();

  const stale = { aspect: "logo", a: "d1", b: "d2", round: 0, left: "d1", choice: "d1", note: "", at: "2026-10-20T00:00:00.000Z" };
  const future = { ...stale, choice: "d2", at: "2099-01-01T00:00:00.000Z" };
  expect((await page.request.put("/api/brand/pick", { data: { answers: [future] } })).status()).toBe(200);
  expect((await page.request.put("/api/brand/pick", { data: { answers: [stale] } })).status()).toBe(200);
  const kept = ((await (await page.request.get("/api/brand/pick")).json()) as { answers: Answer[] }).answers.find((a) => a.aspect === "logo")!;
  expect(kept.choice).toBe("d2");
  expect(Date.parse(kept.at)).toBeLessThan(Date.now() + 60_000);

  expect((await page.request.delete("/api/brand/pick")).status()).toBe(200);
  const device = await browser.newContext({ storageState: { cookies: await page.context().cookies(), origins: [] } });
  const b = await device.newPage();
  await b.goto(PATH);
  await b.evaluate(([k, v]) => localStorage.setItem(k, v), [STORE, JSON.stringify({ seed: 1, answers: [stale] })]);
  await b.reload();
  await expect(b.getByText("Saved to your account.")).toBeVisible();
  await expect.poll(() => answeredCount(b)).toBe(0);
  expect(((await (await page.request.get("/api/brand/pick")).json()) as { answers: Answer[] }).answers).toHaveLength(0);
  await device.close();

  const anon = await browser.newContext();
  const r = await anon.request.get(new URL("/api/brand/pick", page.url()).toString());
  expect(((await r.json()) as { signedIn: boolean; answers: unknown[] })).toEqual({ signedIn: false, answers: [] });
  await anon.close();
});
