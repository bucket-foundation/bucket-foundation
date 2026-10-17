import { test, expect, type Page } from "@playwright/test";

const MAIL = process.env.E2E_MAIL_URL || "http://127.0.0.1:54324";
const email = `e2e-lang-${Date.now()}@bucket.local`;

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
  await page.goto("/sign-in?next=%2Fresearch-os%2Fhome");
  await page.fill("#sign-in-email", email);
  await page.click("button[type=submit]");
  await expect(page.locator("#sign-in-code")).toBeVisible();
  await page.fill("#sign-in-code", await codeFor(email));
  await page.click("button[type=submit]");
  await expect(page).toHaveURL(/\/research-os\/home/);
  const res = await page.request.post("/api/research-os/profile", { data: { role: "independent", birthYearBucket: "18plus" } });
  expect(res.ok()).toBeTruthy();
});
test.afterAll(async () => {
  await page.close();
});

async function answerOne(p: Page): Promise<void> {
  const ex = p.getByTestId("exercise");
  const kind = await ex.getAttribute("data-kind");
  if (kind === "intro") {
    await p.getByTestId("next").click();
    return;
  }
  if (kind === "match") {
    const selects = ex.locator("select");
    const n = await selects.count();
    for (let k = 0; k < n; k++) await selects.nth(k).selectOption({ index: (k % n) + 1 });
    await p.getByTestId("check").click();
    await p.getByTestId("next").click();
    return;
  }
  if (kind === "speak" && (await p.getByRole("button", { name: "type instead" }).count())) await p.getByRole("button", { name: "type instead" }).click();
  if (await p.getByTestId("answer").count()) {
    await p.getByTestId("answer").fill("x");
    await p.getByTestId("check").click();
  } else {
    await p.getByTestId("option").first().click();
  }
  await p.getByTestId("next").click();
}

test("create a Romance system, place French, and study a mixed session", async () => {
  await page.goto("/research-os/learn");
  await page.getByRole("link", { name: "language systems" }).click();
  await expect(page.getByRole("heading", { name: "language systems" })).toBeVisible();
  await page.getByRole("button", { name: /^Romance/ }).click();
  await page.getByRole("button", { name: "create system" }).click();
  await expect(page.getByText("Romance from English")).toBeVisible();

  await page.getByRole("link", { name: "placement" }).click();
  await expect(page.getByTestId("exercise")).toBeVisible();
  await page.getByTestId("skip").click();
  await page.getByTestId("skip").click();
  await expect(page.getByTestId("placement-done")).toBeVisible();
  await expect(page.getByRole("heading", { name: "placed at tier 0" })).toBeVisible();

  await page.getByRole("link", { name: /place Spanish/ }).click();
  await expect(page.getByText("English to Spanish")).toBeVisible();
  await page.goto("/research-os/learn/languages/en-fr-es-it/study");
  const kinds = new Set<string>();
  const langs = new Set<string>();
  for (let n = 0; n < 100; n++) {
    if (await page.getByTestId("session-done").count()) break;
    await expect(page.getByTestId("exercise")).toBeVisible();
    kinds.add((await page.getByTestId("exercise").getAttribute("data-kind")) ?? "");
    langs.add(((await page.getByTestId("exercise").innerText()).split("\n")[0] ?? "").split("·").pop()?.trim() ?? "");
    await answerOne(page);
  }
  await expect(page.getByTestId("session-done")).toBeVisible();
  expect(kinds.has("intro")).toBeTruthy();
  expect(kinds.has("match")).toBeTruthy();
  expect(langs.size).toBeGreaterThanOrEqual(3);

  await page.getByRole("link", { name: "see progress" }).click();
  const rows = page.getByTestId("lang-progress").locator("li");
  await expect(rows).toHaveCount(3);
  await expect(rows.first()).toContainText(/[1-9]\d*\/\d+ started/);
  await expect(page.getByTestId("sys-xp")).toContainText(/[1-9]\d* xp/);

  await page.reload();
  await expect(page.getByTestId("lang-progress").locator("li").first()).toContainText(/[1-9]\d*\/\d+ started/);
});
