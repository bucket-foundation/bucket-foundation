import { test, expect, type Page } from "@playwright/test";

const MAIL = process.env.E2E_MAIL_URL || "http://127.0.0.1:54324";
const email = `e2e-${Date.now()}@bucket.local`;
const staffEmail = process.env.E2E_STAFF_EMAIL || "e2e-staff@bucket.local";

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
let staff: Page;

test.beforeAll(async ({ browser }) => {
  page = await browser.newPage();
  staff = await (await browser.newContext()).newPage();
});
test.afterAll(async () => {
  await page.close();
  await staff.close();
});

async function signIn(p: Page, address: string): Promise<void> {
  await p.goto("/sign-in?next=%2Fresearch-os%2Fhome");
  await p.fill("#sign-in-email", address);
  await p.click("button[type=submit]");
  await expect(p.locator("#sign-in-code")).toBeVisible();
  await p.fill("#sign-in-code", await codeFor(address));
  await p.click("button[type=submit]");
  await expect(p).toHaveURL(/\/research-os\/home/);
}

test("a protected page sends a visitor to sign in", async () => {
  await page.goto("/research-os/home");
  await expect(page).toHaveURL(/\/sign-in/);
  await expect(page.locator("#sign-in-email")).toBeVisible();
});

test("sign in with an email code lands on home", async () => {
  await signIn(page, email);
  await expect(page.getByRole("heading", { name: /today/i })).toBeVisible();
  await expect(page.getByRole("heading", { name: "your path" })).toBeVisible();
});

async function seedAdultProfile(p: Page): Promise<void> {
  const res = await p.request.post("/api/research-os/profile", { data: { role: "independent", birthYearBucket: "18plus" } });
  expect(res.ok(), `profile seed answered ${res.status()}`).toBeTruthy();
}

test("learn asks a user with no age range first", async () => {
  await page.goto("/research-os/learn");
  await expect(page.getByRole("heading", { name: /one question first/i })).toBeVisible();
  await expect(page.getByRole("button", { name: "18 or older" })).toBeVisible();
  await seedAdultProfile(page);
});

test("learn: a deck, an atom, and its drill", async () => {
  await page.goto("/research-os/learn");
  await expect(page.getByRole("heading", { name: /lessons and recall/i })).toBeVisible();
  await page.goto("/research-os/learn/02-physics");
  await expect(page.getByRole("heading", { name: "today's route" })).toBeVisible();
  await page.goto("/research-os/learn/02-physics/kinematics");
  await expect(page.getByRole("heading", { name: /kinematics/i })).toBeVisible();
  await page.getByRole("button", { name: /show the answer/i }).click();
  await page.getByRole("button", { name: /^Good/ }).click();
  await expect(page.getByText(/recorded/i)).toBeVisible();
});

test("the node page carries the standing and the verbs; search opens a node", async () => {
  await page.goto("/research-os/n/academy-02-physics-kinematics");
  await expect(page.getByRole("heading", { name: /kinematics/i })).toBeVisible();
  for (const name of ["learn", "sources", "check", "transfer", "around", "produce", "access"]) {
    await expect(page.locator(`#${name}`)).toBeVisible();
  }
  await page.keyboard.press("Control+k");
  const box = page.getByPlaceholder("search the graph");
  await expect(box).toBeVisible();
  await box.fill("rayleigh");
  await expect(page.getByRole("option").first()).toBeVisible();
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/\/research-os\/n\//);
});

test("a learner outside staff gets 404 on pages outside launch scope", async () => {
  for (const path of ["/research-os/map", "/research-os/workspace", "/research-os/import", "/research-os/status"]) {
    const res = await page.goto(path);
    expect(res?.status(), path).toBe(404);
  }
});

test("staff sign in on a second session", async () => {
  await signIn(staff, staffEmail);
});

test("the map is the graph", async () => {
  const page = staff;
  await page.goto("/research-os/map?branch=02-physics");
  await expect(page.getByRole("heading", { name: /the graph/i })).toBeVisible();
  await expect(page.getByRole("img", { name: /02-physics graph/i })).toBeVisible();
  await expect(page.getByText(/nodes · /)).toBeVisible();
});

test("the workspace and the map render inside the shell", async () => {
  const page = staff;
  await page.goto("/research-os/workspace");
  await expect(page.getByRole("heading", { name: /what are you working toward/i })).toBeVisible();
  await page.goto("/research-os/workspace?target=why-the-sky-is-blue");
  await expect(page.getByRole("heading", { level: 1, name: /why the sky is blue/i })).toBeVisible();
  await page.goto("/research-os/map?view=globe");
  await expect(page.getByRole("heading", { name: /the canon on the globe/i })).toBeVisible();
  await expect(page.getByPlaceholder(/search \d+ source excerpts/i)).toBeVisible();
});

test("account and sign out", async () => {
  await page.goto("/account");
  await expect(page.getByText(email)).toBeVisible();
  await page.locator('form[action="/auth/sign-out"] button').first().click();
  await expect(page).toHaveURL(/\/$/);
  await page.goto("/research-os/home");
  await expect(page).toHaveURL(/\/sign-in/);
});
