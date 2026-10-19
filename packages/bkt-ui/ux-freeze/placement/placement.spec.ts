import { expect, test, type Page } from "@playwright/test";

const MAIL = process.env.UX_FREEZE_MAIL_URL ?? "http://127.0.0.1:54324";
const FROZEN_AT = new Date("2026-10-18T12:00:00Z");
const STUDY_PANE = "aside + div.min-w-0";
const email = `ux-freeze-${Date.now()}@bucket.local`;

test.describe.configure({ mode: "serial" });

let page: Page;

async function codeFor(address: string): Promise<string> {
  for (let i = 0; i < 40; i++) {
    const r = await fetch(`${MAIL}/api/v1/messages?limit=20`);
    if (r.ok) {
      const j = (await r.json()) as { messages?: { ID: string; To?: { Address: string }[] }[] };
      const m = (j.messages ?? []).find((x) => (x.To ?? []).some((t) => t.Address === address));
      if (m) {
        const d = (await (await fetch(`${MAIL}/api/v1/message/${m.ID}`)).json()) as { Text?: string; HTML?: string };
        const hit = `${d.Text ?? ""} ${d.HTML ?? ""}`.match(/\b(\d{6})\b/);
        if (hit) return hit[1];
      }
    }
    await new Promise((res) => setTimeout(res, 1500));
  }
  throw new Error("no sign-in code arrived");
}

async function settle(): Promise<void> {
  await page.evaluate(() => document.fonts.ready);
  await page.evaluate(() => Promise.all([...document.images].map((i) => i.decode().catch(() => undefined))));
  let last = "";
  for (let same = 0; same < 4; ) {
    await page.waitForTimeout(250);
    const now = await page.locator(STUDY_PANE).evaluate((m) => m.outerHTML);
    same = now === last ? same + 1 : 0;
    last = now;
  }
}

async function freeze(name: string): Promise<void> {
  await page.mouse.move(1279, 859);
  await settle();
  expect(await page.locator(STUDY_PANE).evaluate((m) => m.outerHTML)).toMatchSnapshot(`${name}.html`);
  const box = (await page.locator(STUDY_PANE).boundingBox())!;
  const x = Math.ceil(box.x);
  const y = Math.ceil(box.y);
  const clip = { x, y, width: Math.floor(box.x + box.width) - x - 1, height: Math.floor(box.y + box.height) - y - 1 };
  await expect(page).toHaveScreenshot(`${name}.png`, { clip });
}

test.beforeAll(async ({ browser }, info) => {
  const { baseURL, viewport, deviceScaleFactor, locale, timezoneId, colorScheme, reducedMotion } = info.project.use;
  page = await browser.newPage({ baseURL, viewport, deviceScaleFactor, locale, timezoneId, colorScheme, reducedMotion });
  await page.clock.setFixedTime(FROZEN_AT);
  await page.goto("/sign-in?next=%2Fresearch-os%2Fhome");
  await page.fill("#sign-in-email", email);
  await page.click("button[type=submit]");
  await expect(page.locator("#sign-in-code")).toBeVisible();
  await page.fill("#sign-in-code", await codeFor(email));
  await page.click("button[type=submit]");
  await expect(page).toHaveURL(/\/research-os\/home/);
  const res = await page.request.post("/api/research-os/profile", { data: { role: "independent", birthYearBucket: "18plus" } });
  expect(res.ok(), `profile seed answered ${res.status()}`).toBeTruthy();
});

test.afterAll(async () => {
  await page.close();
});

test("placement asks, reveals, and places a new learner in chemistry", async () => {
  await page.goto("/research-os/learn/03-chemistry/place");
  await page.getByRole("button", { name: "begin" }).waitFor();
  await freeze("placement-intro");
  await page.getByRole("button", { name: "begin" }).click();
  await page.getByRole("button", { name: "show the answer" }).waitFor();
  await freeze("placement-question");
  await page.getByRole("button", { name: "show the answer" }).click();
  await page.getByRole("button", { name: "I knew it" }).waitFor();
  await freeze("placement-answer");
  await page.getByRole("button", { name: "I knew it" }).click();
  for (let i = 0; i < 60; i++) {
    const unknown = page.getByRole("button", { name: "I do not know this" });
    if (!(await unknown.isVisible())) break;
    await unknown.click();
    await page.waitForTimeout(100);
  }
  await page.getByRole("heading", { name: "placed" }).waitFor();
  await freeze("placement-placed");
});

test("language placement narrows in on a tier with a fixed seed", async () => {
  await page.goto("/research-os/learn/languages");
  await page.getByRole("group", { name: "languages to learn" }).getByRole("button", { name: "Spanish" }).click();
  await page.getByRole("button", { name: "create system" }).click();
  await page.locator('a[href$="/place"]').first().click();
  await page.getByTestId("option").first().waitFor();
  await freeze("lang-placement-question");
  let typedFrozen = false;
  for (let i = 0; i < 60; i++) {
    if (await page.getByTestId("placement-done").isVisible()) break;
    if (await page.getByTestId("answer").isVisible()) {
      if (!typedFrozen) {
        typedFrozen = true;
        await freeze("lang-placement-typed");
      }
      await page.getByTestId("skip").click();
      await page.waitForTimeout(100);
      continue;
    }
    const option = page.getByTestId("option").first();
    if (!(await option.isVisible())) {
      await page.waitForTimeout(100);
      continue;
    }
    await option.click();
    await page.waitForTimeout(100);
  }
  await page.getByTestId("placement-done").waitFor();
  await freeze("lang-placement-done");
});

const PREVIEW = "bucket-academy/v1/flags/polingual-shared-memory";
let romanceStudy = "";

test("shared memory: a new word leads with the target and links the other languages", async () => {
  await page.goto("/research-os/learn/languages");
  await page.evaluate((k) => localStorage.setItem(k, "1"), PREVIEW);
  await page.reload();
  await page.getByRole("button", { name: /^Romance:/ }).click();
  await page.getByRole("button", { name: "create system" }).click();
  await page.locator('a[href$="/study"]').last().waitFor();
  romanceStudy = (await page.locator('a[href$="/study"]').last().getAttribute("href")) ?? "";
  await page.goto(romanceStudy);
  await page.locator('[data-layout="target"]').waitFor();
  await expect(page.getByTestId("links")).toBeVisible();
  await freeze("lang-intro-links");
});

test("shared memory: a review asks for the meaning of the target word", async () => {
  const items = ["eight", "five", "four", "nine", "seven", "six", "ten", "three", "two", "one", "black", "white"];
  const at = FROZEN_AT.getTime() - 9 * 86_400_000;
  await page.evaluate(
    ({ key, items, at }) => {
      const cards: Record<string, unknown> = {};
      for (const id of items) cards[`es:${id}`] = { state: "review", reps: 4, lapses: 0, stability: 6, difficulty: 5, lastReview: at, due: at + 4 * 86_400_000, introduced: "2026-10-1" };
      localStorage.setItem(key, JSON.stringify({ lang: "es", baseline: { cards, prof: {}, settings: {}, stats: { xp: 0, streak: 0, lastStudyDay: null, history: {} } }, log: [], migrated: "v1" }));
    },
    { key: "bucket-academy/v1/lang-es", items, at }
  );
  await page.goto(romanceStudy);
  const target = page.locator('[data-kind="reverse"] [data-testid="target-headline"]');
  for (let i = 0; i < 30; i++) {
    await page.getByTestId("exercise").waitFor();
    if (await target.isVisible()) break;
    await page.getByTestId("skip-exercise").click();
  }
  await expect(target).toBeVisible();
  await freeze("lang-recall-target");
});
