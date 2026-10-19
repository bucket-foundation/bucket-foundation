import { test, expect, type Page } from "@playwright/test";

const MAIL = process.env.E2E_MAIL_URL || "http://127.0.0.1:54324";
const SHOTS = process.env.E2E_SHOTS || "test-results/guest-entry";
const LEARN = "/research-os/learn";

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

async function noSideScroll(page: Page) {
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
}

for (const [label, viewport] of [["web", { width: 1280, height: 860 }], ["mobile", { width: 390, height: 844 }]] as const) {
  test.describe(`${label} width`, () => {
    test.use({ viewport });

    test("the landing has one headline, one line and one Start learning button", async ({ page }) => {
      await page.goto("/");
      const hero = page.locator("[data-hero]");
      await expect(hero.getByRole("heading", { level: 1 })).toHaveCount(1);
      await expect(hero.locator("p")).toHaveCount(1);
      await expect(hero.getByRole("link")).toHaveCount(1);
      await expect(hero.getByRole("link", { name: "Start learning" })).toHaveAttribute("href", LEARN);
      const header = page.locator("header").first();
      await expect(header.getByRole("link")).toHaveCount(1);
      await expect(header.getByRole("button", { name: "Sign in" })).toBeVisible();
      await expect(page.locator("[data-slim-footer]").getByRole("link", { name: "Download" })).toHaveAttribute("href", "/download");
      await noSideScroll(page);
      await page.screenshot({ path: `${SHOTS}/landing-${label}.png`, fullPage: true });
    });

    test("the download page has one detected button and small links for the rest", async ({ page }) => {
      await page.goto("/download");
      await expect(page.locator("[data-device-primary]")).toHaveCount(1);
      await expect(page.locator("[data-device-other]").first()).toBeVisible();
      await expect(page.locator("[data-device-other=web] a")).toHaveAttribute("href", LEARN);
      await expect(page.locator("[data-download-pane], [data-download-form]")).toHaveCount(0);
      await noSideScroll(page);
      await page.screenshot({ path: `${SHOTS}/download-${label}.png`, fullPage: true });
    });

    test("Start learning opens Learn as a guest with no sign-in step", async ({ page }) => {
      await page.goto("/");
      await page.getByRole("link", { name: "Start learning" }).click();
      await expect(page).toHaveURL(new RegExp(`${LEARN}$`));
      await expect(page.locator("[data-sign-in-modal]")).toHaveCount(0);
      await expect(page.getByRole("heading").first()).toBeVisible();
      await noSideScroll(page);
      await page.screenshot({ path: `${SHOTS}/learn-guest-${label}.png`, fullPage: false });
    });

    test("the header Sign in opens the centered modal over the page", async ({ page }) => {
      await page.goto(LEARN);
      await page.locator("header").first().getByRole("button", { name: "Sign in" }).click();
      const dialog = page.getByRole("dialog");
      await expect(dialog.getByRole("heading", { name: "Enter your email" })).toBeVisible();
      await expect(dialog.getByRole("button", { name: "continue" })).toBeVisible();
      const box = (await dialog.boundingBox())!;
      expect(Math.abs(box.x + box.width / 2 - viewport.width / 2)).toBeLessThan(4);
      await page.screenshot({ path: `${SHOTS}/modal-${label}.png` });
      await page.keyboard.press("Escape");
      await expect(page.getByRole("dialog")).toHaveCount(0);
    });
  });
}

test("a guest studies one lesson, the second asks for an account, and progress merges after the code", async ({ page }) => {
  const email = `e2e-guest-${Date.now()}@bucket.local`;
  await page.goto(LEARN);
  await page.evaluate(() => {
    localStorage.setItem("bucket-academy/v1/e2e-guest", JSON.stringify({ cards: { "e2e-atom": { due: 1, reps: 1 } }, prof: {}, settings: { newPerDay: 10, requestRetention: 0.9 }, stats: { xp: 7, streak: 1, lastStudyDay: null, history: {} } }));
  });
  const guestGet = await page.request.get("/api/academy/progress");
  expect(guestGet.status()).toBe(401);
  await page.locator("[data-guest-sign-in]").or(page.locator("header").first().getByRole("button", { name: "Sign in" })).first().click();
  const dialog = page.getByRole("dialog");
  await dialog.locator("#sign-in-email").fill(email);
  await dialog.getByRole("button", { name: "continue" }).click();
  await expect(dialog.locator("#sign-in-code")).toBeVisible();
  await page.screenshot({ path: `${SHOTS}/modal-code-step.png` });
  await dialog.locator("#sign-in-code").fill(await codeFor(email));
  await dialog.getByRole("button", { name: "sign in" }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(page).toHaveURL(new RegExp(`${LEARN}$`));
  await page.getByRole("button", { name: "18 or older" }).click();
  await expect.poll(async () => {
    const r = await page.request.get("/api/academy/progress");
    if (!r.ok()) return null;
    const j = (await r.json()) as { branches: Record<string, { data: { stats?: { xp?: number } } }> };
    return j.branches["e2e-guest"]?.data?.stats?.xp ?? null;
  }).toBe(7);
});

async function rateCurrent(page: Page) {
  const reveal = page.getByRole("button", { name: "show the answer" });
  const gotIt = page.getByRole("button", { name: "got it" });
  await expect(reveal.or(gotIt).first()).toBeVisible();
  if (await gotIt.isVisible()) {
    await gotIt.click();
    return;
  }
  await reveal.click();
  await page.getByRole("group", { name: "How well did you recall it" }).getByRole("button").nth(2).click();
}

test("a guest grades the first lesson freely and the second opens the sign-in modal", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`${LEARN}/00-learning-to-learn/study`);
  await rateCurrent(page);
  await expect.poll(() => page.evaluate(() => Object.keys(JSON.parse(localStorage.getItem("bucket-academy/v1/00-learning-to-learn") || "{\"cards\":{}}").cards).length)).toBeGreaterThan(0);
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await page.goto(`${LEARN}/01-mathematics/study`);
  await rateCurrent(page);
  await expect(page.getByRole("dialog").getByRole("heading", { name: "Enter your email" })).toBeVisible();
  await page.screenshot({ path: `${SHOTS}/modal-over-study-mobile.png` });
});

test("a guest who opens a gated tab gets the modal and stays on Learn", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 860 });
  await page.goto(LEARN);
  await page.getByRole("complementary").getByRole("link", { name: /Profile/ }).click();
  await expect(page.getByRole("dialog").getByRole("heading", { name: "Enter your email" })).toBeVisible();
  await expect(page).toHaveURL(new RegExp(`${LEARN}$`));
});
