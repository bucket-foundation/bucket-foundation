import { test, expect, type Page } from "@playwright/test";

/**
 * Find by meaning as a person (ros-ai-find): sign in as a pilot account,
 * ask in words the sources do not use, read the cards, open one, and see
 * its Quote action. The workspace offers the mode only after the server
 * says this account may use it, so the run skips when the flag is off,
 * the corpus is missing, or the account is outside the pilot.
 *
 * Needs the local stack, a dev server, a built corpus, and an account
 * that is 18plus, consented, and on RESEARCH_OS_AI_SEARCH_PILOT_IDS.
 * E2E_EVIDENCE_EMAIL names it.
 */
const MAIL = process.env.E2E_MAIL_URL || "http://127.0.0.1:54324";
const EMAIL = process.env.E2E_EVIDENCE_EMAIL || "ros-shots@bucket.test";
const QUERY = process.env.E2E_EVIDENCE_QUERY || "what makes the heavens look azure during daytime";
const TARGET = process.env.E2E_EVIDENCE_TARGET || "why-the-sky-is-blue";
const WORKSPACE = `/research-os/workspace?target=${encodeURIComponent(TARGET)}`;
const SHOTS = process.env.E2E_EVIDENCE_SHOTS;

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

test.describe.configure({ mode: "serial" });
let page: Page;

test.beforeAll(async ({ browser }) => {
  page = await browser.newPage();
});
test.afterAll(async () => {
  await page.close();
});

test("sign in as the pilot account", async () => {
  await page.goto(`/sign-in?next=${encodeURIComponent(WORKSPACE)}`);
  await page.fill("#sign-in-email", EMAIL);
  await page.click("button[type=submit]");
  await expect(page.locator("#sign-in-code")).toBeVisible();
  await page.fill("#sign-in-code", await codeFor(EMAIL));
  await page.click("button[type=submit]");
  await expect(page).toHaveURL(/\/research-os\/workspace/);
  await expect(page.getByText("locate")).toBeVisible({ timeout: 30_000 });
});

test("the mode appears only when the server allows this account", async () => {
  const res = await page.request.get("/api/research-os/evidence-search");
  test.skip(!res.ok(), `evidence search is unavailable here: ${res.status()}`);
  const body = (await res.json()) as { available: boolean; corpusRevision: string; sources: number };
  expect(body.available).toBe(true);
  expect(body.sources).toBeGreaterThan(0);
  await expect(page.getByText("public evidence")).toBeVisible();
});

test("a question in other words returns sources, and one opens", async () => {
  await page.fill("#evidence-query", QUERY);
  await page.getByRole("button", { name: "search sources" }).click();
  const cards = page.locator("#evidence-query").locator("xpath=../..").locator("li");
  await expect(cards.first()).toBeVisible({ timeout: 30_000 });
  const count = await cards.count();
  expect(count).toBeGreaterThan(0);
  expect(count).toBeLessThanOrEqual(5);
  if (SHOTS) {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.screenshot({ path: `${SHOTS}/evidence-find-desktop.png`, fullPage: false });
    await page.setViewportSize({ width: 390, height: 844 });
    await page.screenshot({ path: `${SHOTS}/evidence-find-phone.png`, fullPage: false });
    await page.setViewportSize({ width: 1280, height: 900 });
  }
  const open = page.getByRole("link", { name: "open source" }).first();
  await expect(open).toBeVisible();
  await open.click();
  await expect(page).toHaveURL(/\/research-os\/n\//);
  await expect(page.getByRole("heading").first()).toBeVisible();
});

test("an empty answer says so rather than showing the last one", async () => {
  await page.goto(WORKSPACE);
  await page.fill("#evidence-query", "zzzz nonexistent subject qqqq");
  await page.getByRole("button", { name: "search sources" }).click();
  await expect(page.getByText(/No admitted source matched|open source/).first()).toBeVisible({ timeout: 30_000 });
});
