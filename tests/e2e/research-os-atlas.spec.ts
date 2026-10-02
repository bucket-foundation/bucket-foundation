import { test, expect } from "@playwright/test";

const MAIL = process.env.E2E_MAIL_URL || "http://127.0.0.1:54324";
const EMAIL = process.env.E2E_ATLAS_EMAIL || "atlas-smoke@bucket.test";
const ATLAS = "/research-os/solvability";

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

test("the solvability atlas renders in cards and the four space views", async ({ page }) => {
  const mail = await fetch(`${MAIL}/api/v1/messages?limit=1`).catch(() => null);
  const required = process.env.E2E_REQUIRE_ATLAS === "1";
  if (required) expect(mail?.ok, `local mail server at ${MAIL} is not running`).toBe(true);
  test.skip(!required && !mail?.ok, `local mail server at ${MAIL} is not running`);
  await page.goto(`/sign-in?next=${encodeURIComponent(ATLAS)}`);
  await page.fill("#sign-in-email", EMAIL);
  await page.click("button[type=submit]");
  await expect(page.locator("#sign-in-code")).toBeVisible();
  await page.fill("#sign-in-code", await codeFor(EMAIL));
  await page.click("button[type=submit]");
  await expect(page).toHaveURL(/\/research-os\/solvability/);
  const gated = await page.getByRole("heading", { name: "Not in the canon." }).isVisible();
  if (required) expect(gated, `${EMAIL} is not in RESEARCH_OS_REVIEWER_EMAILS on the server under test`).toBe(false);
  test.skip(gated, `${EMAIL} is not in RESEARCH_OS_REVIEWER_EMAILS on the server under test`);
  await expect(page.getByRole("heading", { name: "solvability atlas" })).toBeVisible();
  await expect(page.locator("canvas")).toHaveCount(0);
  for (const view of ["circle", "sphere", "slices", "helix"]) {
    await page.getByRole("button", { name: view, exact: true }).click();
    await expect(page.getByRole("button", { name: view, exact: true })).toHaveAttribute("aria-pressed", "true");
    await expect(page.locator("canvas").first()).toBeVisible();
  }
});
