import { expect, test } from "@playwright/test";
import { mockCorpus } from "./daily-mock";
import { mockApi, seeded, signIn } from "./mock";

test("silent mode from the account gates sound games and keeps listening cards out of the session", async ({ page }) => {
  await mockCorpus(page);
  await mockApi(page, { branches: seeded() });
  await page.addInitScript(() => addEventListener("DOMContentLoaded", () => { const s = document.createElement("style"); s.textContent = "nextjs-portal{display:none!important}"; document.head.appendChild(s); }));
  await signIn(page);
  await page.goto("/app/account");
  const sw = page.getByTestId("silent-switch");
  await expect(sw).toHaveAttribute("aria-checked", "false", { timeout: 60_000 });
  await sw.click();
  await expect(sw).toHaveAttribute("aria-checked", "true");
  await page.goto("/play/which-voice");
  await expect(page.getByTestId("needs-sound")).toContainText("Which Voice needs sound", { timeout: 60_000 });
  await page.goto("/app/en-es-fr/study");
  await expect(page.getByTestId("session")).toBeVisible({ timeout: 60_000 });
  const kinds = new Set<string>();
  for (let n = 0; n < 40 && !(await page.getByTestId("session-done").isVisible()); n++) {
    const ex = page.locator("[data-testid=exercise]").first();
    if (!(await ex.isVisible().catch(() => false))) break;
    kinds.add((await ex.getAttribute("data-kind")) ?? "");
    await page.getByTestId("skip-exercise").click();
  }
  for (const k of ["listen", "type-heard", "spell-heard", "speak"]) expect(kinds.has(k), k).toBe(false);
  await page.goto("/play/which-voice");
  await page.getByTestId("silent-switch").last().click();
  await expect(page.getByTestId("needs-sound")).toHaveCount(0);
});
