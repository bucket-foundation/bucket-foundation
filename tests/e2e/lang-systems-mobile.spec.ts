import { test, expect, type Page } from "@playwright/test";

const MAIL = process.env.E2E_MAIL_URL || "http://127.0.0.1:54324";
const email = `e2e-lang-m-${Date.now()}@bucket.local`;

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
const errors: string[] = [];

test.beforeAll(async ({ browser }) => {
  page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  page.on("pageerror", (e) => errors.push(e.message));
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

async function noOverflow(p: Page, where: string) {
  const wide = await p.evaluate(() => {
    const w = document.documentElement.clientWidth;
    const out: string[] = [];
    for (const el of Array.from(document.querySelectorAll("body *"))) {
      const r = (el as HTMLElement).getBoundingClientRect();
      if (r.right > w + 1 && r.width > 0) out.push(`${el.tagName}.${(el as HTMLElement).className.toString().slice(0, 40)} ${Math.round(r.right)}`);
    }
    return { scroll: document.documentElement.scrollWidth, w, out: out.slice(0, 5) };
  });
  expect(wide.scroll, `${where}: ${wide.out.join(" | ")}`).toBeLessThanOrEqual(wide.w);
}

test("phone width: create, edit, study a set with a shared form, no overflow", async () => {
  await page.goto("/research-os/learn/languages");
  await expect(page.getByRole("heading", { name: "language systems" })).toBeVisible();
  await noOverflow(page, "home");
  await page.getByRole("button", { name: "Spanish", exact: true }).click();
  await page.getByLabel("root language").selectOption("es");
  await expect(page.getByRole("button", { name: "create system" })).toBeDisabled();
  await expect(page.getByText("The root language cannot also be a target.")).toHaveCount(0);
  await page.getByLabel("root language").selectOption("en");
  await page.getByRole("button", { name: "Spanish", exact: true }).click();
  await page.getByRole("button", { name: "Italian", exact: true }).click();
  await page.getByRole("button", { name: "create system" }).click();
  await expect(page.getByText("Spanish · Italian from English")).toBeVisible();

  await page.goto("/research-os/learn/languages/en-es-it");
  await noOverflow(page, "system");
  await page.getByRole("button", { name: "edit languages" }).click();
  await page.getByTestId("edit-langs").getByRole("button", { name: "French", exact: true }).click();
  await page.getByRole("button", { name: "save languages" }).click();
  await expect(page.getByTestId("lang-progress").locator("li")).toHaveCount(3);

  await page.goto("/research-os/learn/languages/en-es-it/study");
  for (let n = 0; n < 80; n++) {
    if (await page.getByTestId("session-done").count()) break;
    await expect(page.getByTestId("exercise")).toBeVisible();
    await noOverflow(page, `study ${n}`);
    await page.getByTestId("skip-exercise").click();
  }
  await expect(page.getByTestId("session-done")).toBeVisible();

  await page.goto("/research-os/learn/languages");
  await page.getByRole("button", { name: /^East Asian/ }).click();
  await page.getByRole("button", { name: "create system" }).click();
  await page.goto("/research-os/learn/languages/en-zh-ja/study");
  for (let n = 0; n < 10; n++) {
    await expect(page.getByTestId("exercise")).toBeVisible();
    await noOverflow(page, `zh-ja ${n}`);
    await page.getByTestId("skip-exercise").click();
  }
  expect(errors, errors.join("\n")).toHaveLength(0);
});
