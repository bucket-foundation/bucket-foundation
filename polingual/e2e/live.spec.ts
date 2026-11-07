import { expect, test, type Browser, type Page } from "@playwright/test";
import { mkdirSync } from "node:fs";
import { randomUUID } from "node:crypto";

const URL_ = process.env.LIVE_LOCAL_URL ?? "";
const SERVICE = process.env.LIVE_LOCAL_SERVICE_KEY ?? "";
const ANON = process.env.LIVE_LOCAL_ANON_KEY ?? "";
const SHOTS = process.env.PL_SHOTS_DIR ?? "test-results/stoa";
const PHONES = 5;

const HOST_SESSION = process.env.PL_LIVE_HOST_SESSION ?? "";
const REMOTE = Boolean(process.env.PL_LIVE_BASE_URL && HOST_SESSION);

test.skip(!REMOTE && !/^http:\/\/(127\.0\.0\.1|localhost)/.test(URL_), "needs the local Supabase stack, or PL_LIVE_BASE_URL with PL_LIVE_HOST_SESSION");

async function hostSession(): Promise<{ access_token: string; user_id: string }> {
  const email = `stoa-host-${randomUUID()}@bucket.test`;
  const password = randomUUID();
  const made = await fetch(`${URL_}/auth/v1/admin/users`, {
    method: "POST",
    headers: { apikey: SERVICE, Authorization: `Bearer ${SERVICE}`, "Content-Type": "application/json" },
    body: JSON.stringify({ email, password, email_confirm: true }),
  });
  const user = (await made.json()) as { id: string };
  const r = await fetch(`${URL_}/auth/v1/token?grant_type=password`, { method: "POST", headers: { apikey: ANON, "Content-Type": "application/json" }, body: JSON.stringify({ email, password }) });
  const s = (await r.json()) as { access_token: string };
  return { access_token: s.access_token, user_id: user.id };
}

async function signInHost(page: Page): Promise<void> {
  if (REMOTE) {
    await page.addInitScript((raw) => window.localStorage.setItem("polingual-web/session/v1", raw), HOST_SESSION);
    await page.goto("/live");
    await expect(page.getByTestId("host-setup")).toBeVisible({ timeout: 60_000 });
    return;
  }
  const s = await hostSession();
  await page.route("**/api/academy/session", async (route) => {
    const b = route.request().postDataJSON() as Record<string, unknown>;
    if (b.action === "otp") return route.fulfill({ json: { ok: true } });
    if (b.action === "verify") return route.fulfill({ json: { access_token: s.access_token, refresh_token: "local", expires_at: Math.floor(Date.now() / 1000) + 3000, user_id: s.user_id } });
    return route.fulfill({ status: 400, json: { error: "bad_code" } });
  });
  await page.goto("/live");
  await page.getByTestId("email").fill("teacher@example.com");
  await page.getByRole("button", { name: "Email me a code" }).click();
  await page.getByTestId("code").fill("123456");
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page.getByTestId("host-setup")).toBeVisible({ timeout: 60_000 });
}

async function phone(browser: Browser, code: string, typeCode: boolean): Promise<Page> {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  const p = await ctx.newPage();
  if (typeCode) {
    await p.goto("/join");
    await p.getByTestId("code-input").fill(code.toLowerCase());
    await p.getByTestId("join-code").getByRole("button", { name: "Next" }).click();
  } else {
    await p.goto(`/join/${code}`);
  }
  await expect(p.getByTestId("join-name")).toBeVisible({ timeout: 60_000 });
  return p;
}

async function questionNumber(host: Page): Promise<number> {
  const text = (await host.getByTestId("board-question").locator("span").first().textContent()) ?? "";
  return Number(/Question (\d+)/.exec(text)?.[1] ?? 0);
}

test("one host and five phones play a whole game on the local stack", async ({ browser }) => {
  mkdirSync(SHOTS, { recursive: true });
  const hostCtx = await browser.newContext({ viewport: { width: 1920, height: 1080 } });
  const host = await hostCtx.newPage();
  await signInHost(host);
  await host.getByTestId("target-fr").click();
  await host.getByTestId("school-mode").check();
  await host.getByTestId("create-room").click();
  await expect(host.getByTestId("board-lobby")).toBeVisible({ timeout: 30_000 });
  const code = ((await host.getByTestId("room-code").textContent()) ?? "").trim();
  expect(code).toMatch(/^[0-9A-HJKMNP-TV-Z]{6}$/);
  await expect(host.getByTestId("qr")).toBeVisible();

  const phones: Page[] = [];
  for (let i = 0; i < PHONES; i++) {
    const p = await phone(browser, code, i === 0);
    if (i === 0) await p.screenshot({ path: `${SHOTS}/phone-name-390.png` });
    await p.getByTestId("nickname").first().click();
    await expect(p.getByTestId("phone-lobby")).toBeVisible({ timeout: 30_000 });
    phones.push(p);
  }
  await expect(host.getByTestId("player-count")).toHaveText(`${PHONES} players`, { timeout: 15_000 });
  await expect(host.getByTestId("roster").locator("li")).toHaveCount(PHONES);
  await host.screenshot({ path: `${SHOTS}/board-lobby-1920.png` });
  await phones[0].screenshot({ path: `${SHOTS}/phone-lobby-390.png` });

  await phones[4].evaluate(() => {
    document.documentElement.dir = "rtl";
    document.documentElement.lang = "ar";
  });
  await host.getByTestId("start").click();
  for (let n = 1; n <= 15; n++) {
    await expect(host.getByTestId("board-question")).toBeVisible({ timeout: 30_000 });
    await expect.poll(() => questionNumber(host), { timeout: 15_000 }).toBe(n);
    for (let i = 0; i < PHONES; i++) {
      const p = phones[i];
      const tile = p.getByTestId(`tile-${"ABCD"[(i + n) % 4]}`);
      await expect(tile).toBeEnabled({ timeout: 15_000 });
      if (n === 1 && i === 4) {
        const mark = await p.getByTestId("tile-A").locator("svg").boundingBox();
        const label = await p.getByTestId("tile-A").locator("span").last().boundingBox();
        expect(mark!.x).toBeGreaterThan(label!.x);
        await p.screenshot({ path: `${SHOTS}/phone-question-rtl-390.png` });
      }
      if (n === 1 && i === 0) {
        await p.screenshot({ path: `${SHOTS}/phone-question-390.png` });
        await host.screenshot({ path: `${SHOTS}/board-question-1920.png` });
      }
      await tile.click();
      await expect(p.getByTestId("locked")).toBeVisible();
    }
    await expect(host.getByTestId("board-reveal")).toBeVisible({ timeout: 15_000 });
    await expect(phones[0].getByTestId("result")).toBeVisible({ timeout: 15_000 });
    if (n === 1) {
      await host.evaluate(() => (document.documentElement.dir = "rtl"));
      const a = await host.getByTestId("tile-A").boundingBox();
      const b = await host.getByTestId("tile-B").boundingBox();
      expect(a!.x).toBeLessThan(b!.x);
      await host.evaluate(() => (document.documentElement.dir = "ltr"));
      await host.screenshot({ path: `${SHOTS}/board-reveal-1920.png` });
      await phones[0].screenshot({ path: `${SHOTS}/phone-result-390.png` });
    }
    if (n === 15) break;
    await host.getByTestId("skip").click();
    if (n % 5 === 0) {
      await expect(host.getByTestId("board-standings")).toBeVisible({ timeout: 15_000 });
      if (n === 5) await host.screenshot({ path: `${SHOTS}/board-standings-1920.png` });
      await host.getByTestId("skip").click();
    }
  }
  await host.getByTestId("skip").click();
  await expect(host.getByTestId("board-finale")).toBeVisible({ timeout: 15_000 });
  await expect(host.getByTestId("finale-top").locator("li")).toHaveCount(PHONES);
  await expect(host.getByTestId("board-promo")).toHaveCount(0);
  await host.screenshot({ path: `${SHOTS}/board-finale-1920.png` });
  for (const p of phones) {
    await expect(p.getByTestId("phone-finale")).toBeVisible({ timeout: 15_000 });
    await expect(p.getByTestId("app-link")).toHaveCount(0);
  }
  await phones[0].screenshot({ path: `${SHOTS}/phone-finale-390.png` });

  for (const p of phones) {
    const status = p.getByTestId("phone-status");
    await expect(status).toHaveAttribute("data-socket", "open");
    expect(Number(await status.getAttribute("data-verified"))).toBeGreaterThan(5);
  }
  for (const p of phones) {
    const fits = await p.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth);
    expect(fits).toBe(true);
  }

  await phones[1].reload();
  await expect(phones[1].getByTestId("phone-finale")).toBeVisible({ timeout: 30_000 });
  await host.getByTestId("end").click();
});

test("without school mode the board and phones show the app link, and an RTL phone plays Arabic options", async ({ browser }) => {
  mkdirSync(SHOTS, { recursive: true });
  const hostCtx = await browser.newContext({ viewport: { width: 1920, height: 1080 } });
  const host = await hostCtx.newPage();
  await signInHost(host);
  await host.getByTestId("target-es").click();
  await host.getByTestId("target-ar").click();
  await host.getByTestId("create-room").click();
  await expect(host.getByTestId("board-lobby")).toBeVisible({ timeout: 30_000 });
  const code = ((await host.getByTestId("room-code").textContent()) ?? "").trim();
  const p = await phone(browser, code, false);
  await p.evaluate(() => {
    document.documentElement.dir = "rtl";
    document.documentElement.lang = "ar";
  });
  await p.getByTestId("nickname").first().click();
  await expect(p.getByTestId("phone-lobby")).toBeVisible({ timeout: 30_000 });
  await host.getByTestId("start").click();
  let shot = false;
  for (let n = 1; n <= 15 && !shot; n++) {
    await expect(p.getByTestId("tile-A")).toBeEnabled({ timeout: 20_000 });
    const text = (await p.getByTestId("prompt").textContent()) ?? "";
    const options = (await p.getByTestId("tiles").textContent()) ?? "";
    if (/Pick the word/.test(text) && /[\u0600-\u06FF]/.test(options)) {
      const mark = await p.getByTestId("tile-A").locator("svg").boundingBox();
      const label = await p.getByTestId("tile-A").locator("span").last().boundingBox();
      expect(mark!.x).toBeGreaterThan(label!.x);
      await p.screenshot({ path: `${SHOTS}/phone-question-rtl-390.png` });
      shot = true;
    }
    await p.getByTestId("tile-A").click();
    await expect(host.getByTestId("board-reveal")).toBeVisible({ timeout: 15_000 });
    if (!shot) {
      await host.getByTestId("skip").click();
      if (n % 5 === 0) await host.getByTestId("skip").click();
    }
  }
  expect(shot, "an Arabic pick-the-word question came up").toBe(true);
  await host.getByTestId("end").click();
  await expect(host.getByTestId("board-finale")).toBeVisible({ timeout: 15_000 });
  await expect(host.getByTestId("board-promo")).toBeVisible();
  await expect(p.getByTestId("phone-finale")).toBeVisible({ timeout: 15_000 });
  await expect(p.getByTestId("app-link")).toBeVisible();
});
