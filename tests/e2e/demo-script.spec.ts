import { test, expect, type Page } from "@playwright/test";

const MAIL = process.env.E2E_MAIL_URL || "http://127.0.0.1:54324";
const LEARN = "/research-os/learn";

type Ev = { name: string; data: Record<string, unknown> };

async function recordEvents(page: Page) {
  await page.addInitScript(() => {
    const rec = (kind: string, payload: { name: string; data?: unknown }) => {
      if (kind !== "event") return;
      const all = JSON.parse(localStorage.getItem("__e2e_events") || "[]");
      all.push({ name: payload.name, data: payload.data ?? {} });
      localStorage.setItem("__e2e_events", JSON.stringify(all));
    };
    Object.defineProperty(window, "va", { configurable: true, get: () => rec, set: () => undefined });
  });
}

async function events(page: Page): Promise<Ev[]> {
  return page.evaluate(() => JSON.parse(localStorage.getItem("__e2e_events") || "[]") as Ev[]);
}

async function codeFor(address: string): Promise<string> {
  for (let i = 0; i < 40; i++) {
    const r = await fetch(`${MAIL}/api/v1/messages?limit=20`);
    if (r.ok) {
      const j = (await r.json()) as { messages?: { ID: string; To?: { Address: string }[] }[] };
      const m = (j.messages ?? []).find((x) => (x.To ?? []).some((t) => t.Address === address));
      if (m) {
        const d = (await (await fetch(`${MAIL}/api/v1/message/${m.ID}`)).json()) as { Text?: string; HTML?: string };
        const hit = ((d.Text ?? "") + " " + (d.HTML ?? "")).match(/\b(\d{6,8})\b/);
        if (hit) return hit[1];
      }
    }
    await new Promise((res) => setTimeout(res, 1500));
  }
  throw new Error("no sign-in code arrived");
}

async function rateCurrent(page: Page) {
  const reveal = page.getByRole("button", { name: "show the answer" });
  const gotIt = page.getByRole("button", { name: "got it" });
  await expect(reveal.or(gotIt).first()).toBeVisible();
  if (await gotIt.isVisible()) await gotIt.click();
  else {
    await reveal.click();
    await page.getByRole("group", { name: "How well did you recall it" }).getByRole("button").nth(2).click();
  }
}

async function guestCard(page: Page, deck: string) {
  await page.goto(`${LEARN}/${deck}/study`);
  await page.waitForLoadState("networkidle");
  await rateCurrent(page);
  await expect.poll(() => page.evaluate((d) => Object.keys(JSON.parse(localStorage.getItem(`bucket-academy/v1/${d}`) || "{\"cards\":{}}").cards).length, deck)).toBeGreaterThan(0);
}

async function answerOne(p: Page) {
  const ex = p.getByTestId("exercise");
  await expect(ex).toBeVisible();
  const kind = await ex.getAttribute("data-kind");
  if (kind === "intro") return p.getByTestId("next").click();
  if (kind === "match") {
    const selects = ex.locator("select");
    const n = await selects.count();
    for (let k = 0; k < n; k++) await selects.nth(k).selectOption({ index: (k % n) + 1 });
  } else if (kind === "wordbank") await p.getByTestId("token").first().click();
  else {
    if (kind === "speak" && (await p.getByRole("button", { name: "type instead" }).count())) await p.getByRole("button", { name: "type instead" }).click();
    if (await p.getByTestId("answer").count()) await p.getByTestId("answer").fill("x");
    else {
      await p.getByTestId("option").first().click();
      return p.getByTestId("next").click();
    }
  }
  await p.getByTestId("check").click();
  await p.getByTestId("next").click();
}

async function signInThroughModal(page: Page, email: string) {
  const dialog = page.getByRole("dialog");
  await expect(dialog.getByRole("heading", { name: "Enter your email" })).toBeVisible();
  await dialog.locator("#sign-in-email").fill(email);
  await dialog.getByRole("button", { name: "continue" }).click();
  await dialog.locator("#sign-in-code").fill(await codeFor(email));
  await dialog.getByRole("button", { name: "sign in" }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
}

const LANG_PERSONAS: [string, string[], string][] = [["ru-en", ["Russian"], "en-ru"], ["es", ["Spanish", "Portuguese"], "en-es-pt"], ["he", ["Hebrew"], "en-he"]];

for (const [tag, targets, system] of LANG_PERSONAS) {
  test(`persona ${tag}: guest builds a language system and studies one Polingual lesson, the second opens the modal`, async ({ page }) => {
    test.setTimeout(240_000);
    await recordEvents(page);
    await page.goto(`/?demo=${tag}`);
    await page.getByRole("link", { name: "Start learning" }).click();
    await expect(page).toHaveURL(new RegExp(`${LEARN}$`));
    await expect(page.locator("[data-guest-learn]").getByRole("heading", { name: "language systems" })).toBeVisible();
    for (const t of targets) await page.getByRole("group", { name: "languages to learn" }).getByRole("button", { name: t, exact: true }).click();
    await page.getByRole("button", { name: "create system" }).click();
    await expect(page.locator("[data-guest-save]")).toBeVisible();
    await expect(page.getByRole("dialog")).toHaveCount(0);
    await page.goto(`${LEARN}/languages/${system}/study`);
    for (let n = 0; n < 2; n++) await answerOne(page);
    await page.reload();
    for (let n = 0; n < 2; n++) await answerOne(page);
    await expect(page.getByRole("dialog")).toHaveCount(0);
    await page.evaluate(() => {
      const held = JSON.parse(localStorage.getItem("bucket-guest-lang-lesson") || "{}");
      localStorage.setItem("bucket-guest-lang-lesson", JSON.stringify({ ...held, at: Date.now() - 46 * 60 * 1000 }));
    });
    await page.goto(`${LEARN}/languages/${system}/study`);
    for (let n = 0; n < 6 && !(await page.getByRole("dialog").count()); n++) await answerOne(page);
    await signInThroughModal(page, `e2e-demo-${tag}-${Date.now()}@bucket.local`);
    await page.getByRole("button", { name: "18 or older" }).click();
    await expect.poll(async () => {
      const r = await page.request.get("/api/academy/progress");
      if (!r.ok()) return [];
      const j = (await r.json()) as { branches: Record<string, unknown> };
      return Object.keys(j.branches);
    }).toEqual(expect.arrayContaining(["lang-systems"]));
    expect(await page.evaluate(() => localStorage.getItem("bucket-guest-lang-lesson"))).toBeNull();
    const names = (await events(page)).map((e) => e.name);
    expect(names).toEqual(expect.arrayContaining(["start_learning_click", "open_research_os", "sign_in_complete"]));
    for (const e of await events(page)) expect(e.data.demo).toBe(tag);
  });
}

test("a guest's second language system asks for an account", async ({ page }) => {
  await page.goto(LEARN);
  const picker = page.locator("[data-guest-learn]");
  await picker.getByRole("button", { name: /^Romance/ }).click();
  await picker.getByRole("button", { name: "create system" }).click();
  await expect(page.locator("[data-guest-save]")).toBeVisible();
  await picker.getByRole("button", { name: /^Germanic/ }).click();
  await picker.getByRole("button", { name: "create system" }).click();
  await expect(page.getByRole("dialog").getByRole("heading", { name: "Enter your email" })).toBeVisible();
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: "save to your account" }).click();
  await expect(page.getByRole("dialog").getByRole("heading", { name: "Enter your email" })).toBeVisible();
});

test("persona sci: one free deck card, the second deck opens the modal", async ({ page }) => {
  await recordEvents(page);
  await page.goto("/?demo=sci");
  await page.getByRole("link", { name: "Start learning" }).click();
  await guestCard(page, "00-learning-to-learn");
  await page.goto(`${LEARN}/01-mathematics/study`);
  await page.waitForLoadState("networkidle");
  await rateCurrent(page);
  await signInThroughModal(page, `e2e-demo-sci-${Date.now()}@bucket.local`);
  await page.getByRole("button", { name: "18 or older" }).click();
  await page.goto(LEARN);
  await expect(page.getByText(/xp/).first()).toBeVisible();
  expect((await events(page)).every((e) => e.data.demo === "sci")).toBe(true);
});

test("persona res: canon search answers a guest query", async ({ page }) => {
  await recordEvents(page);
  await page.goto("/canon/search?demo=res&q=entropy");
  await expect(page.locator("main")).toContainText(/entropy/i);
});
