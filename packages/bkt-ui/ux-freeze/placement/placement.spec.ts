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
  for (let i = 0; i < 60; i++) {
    if (await page.getByTestId("placement-done").isVisible()) break;
    if (await page.getByTestId("answer").isVisible()) {
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
