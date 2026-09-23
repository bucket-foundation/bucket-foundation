import { test, expect, type Page } from "@playwright/test";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

const MAIL = process.env.E2E_MAIL_URL || "http://127.0.0.1:54324";
const EMAIL = process.env.E2E_IMPORT_EMAIL || "ros-shots@bucket.test";
const SHOTS = process.env.E2E_IMPORT_SHOTS;

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
let dir: string;
let file: string;

test.beforeAll(async ({ browser }) => {
  page = await browser.newPage();
  dir = mkdtempSync(path.join(tmpdir(), "import-e2e-"));
  file = path.join(dir, "rows.csv");
  writeFileSync(file, `year,value\n2026,${Date.now()}\n`);
});
test.afterAll(async () => {
  await page.close();
  rmSync(dir, { recursive: true, force: true });
});

test("sign in and open the import page", async () => {
  await page.goto("/sign-in?next=%2Fresearch-os%2Fimport");
  await page.fill("#sign-in-email", EMAIL);
  await page.click("button[type=submit]");
  await expect(page.locator("#sign-in-code")).toBeVisible();
  await page.fill("#sign-in-code", await codeFor(EMAIL));
  await page.click("button[type=submit]");
  await expect(page).toHaveURL(/\/research-os\/import/);
  await expect(page.getByRole("heading", { name: /bring a file in/i })).toBeVisible();
});

test("the age check is on file before a file can be recorded", async () => {
  await page.goto("/research-os/profile");
  await page.getByLabel("independent adult learner").check();
  await page.getByLabel("18 or older").check();
  await page.getByRole("button", { name: "save profile" }).click();
  await expect(page.getByText(/Profile saved\./)).toBeVisible();
  await page.goto("/research-os/import");
  await expect(page.getByRole("heading", { name: /bring a file in/i })).toBeVisible();
});

test("a chosen file shows what kind it is before anything is sent", async () => {
  await page.setInputFiles("#import-files", file);
  await expect(page.getByText("rows.csv")).toBeVisible();
  await expect(page.getByText(/table · text\/csv/)).toBeVisible();
});

test("the file is hashed, uploaded and recorded", async () => {
  await page.fill("#import-title", "A small table");
  await page.fill("#import-note", "written by the import walk");
  await page.getByRole("button", { name: "import these files" }).click();
  await expect(page.getByText(/Recorded\./)).toBeVisible({ timeout: 60_000 });
  await expect(page.getByText("1 of 1 files recorded.")).toBeVisible();
  await expect(page.getByRole("link", { name: "open the import" })).toBeVisible();
  if (SHOTS) {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.screenshot({ path: `${SHOTS}/import-desktop.png` });
    await page.setViewportSize({ width: 390, height: 844 });
    await page.screenshot({ path: `${SHOTS}/import-phone.png` });
    await page.setViewportSize({ width: 1280, height: 900 });
  }
});

test("the same bytes a second time are one object", async () => {
  await page.goto("/research-os/import");
  await page.setInputFiles("#import-files", file);
  await page.fill("#import-title", "The same table again");
  await page.getByRole("button", { name: "import these files" }).click();
  await expect(page.getByText(/Already in storage; recorded\./)).toBeVisible({ timeout: 60_000 });
});

test("the import's node opens", async () => {
  await page.goto("/research-os/import");
  await page.setInputFiles("#import-files", file);
  await page.fill("#import-title", "A third import of it");
  await page.getByRole("button", { name: "import these files" }).click();
  await expect(page.getByRole("link", { name: "open the import" })).toBeVisible({ timeout: 60_000 });
  await page.getByRole("link", { name: "open the import" }).click();
  await expect(page).toHaveURL(/\/research-os\/n\//);
});
