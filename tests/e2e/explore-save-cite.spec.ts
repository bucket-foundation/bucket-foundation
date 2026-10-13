import fs from "node:fs";
import { test, expect, type Page } from "@playwright/test";

test.use({ viewport: { width: 1440, height: 900 } });

async function open(page: Page) {
  await page.goto("/explore");
  await expect(page.getByTestId("explore-results").getByTestId("save-button").first()).toBeVisible({ timeout: 90_000 });
}

async function search(page: Page, q: string) {
  await page.getByTestId("explore-query").fill(q);
  await page.getByTestId("explore-query").press("Enter");
  await expect(page.getByTestId("explore-results").getByTestId("cite-button").first()).toBeVisible({ timeout: 60_000 });
}

const PAPER = "General theory of natural equivalences";

test("a visitor saves two results, finds them after a reload, cites one, removes one and downloads the list", async ({ page, context }) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await open(page);
  const rows = page.getByTestId("explore-results").getByTestId("result-actions");
  const panel = page.getByTestId("saved-panel");
  await expect(panel).toContainText("Nothing saved yet");

  await rows.nth(0).getByTestId("save-button").click();
  await rows.nth(1).getByTestId("save-button").focus();
  await page.keyboard.press("Enter");
  await expect(rows.nth(1).getByTestId("save-button")).toHaveAttribute("aria-pressed", "true");
  await expect(panel.getByTestId("saved-item")).toHaveCount(2);
  await expect(panel.getByTestId("saved-notice")).toContainText("Saved on this device, in this browser.");
  await expect(panel).not.toContainText(/json|bibtex|localStorage/i);

  await page.reload();
  await expect(page.getByTestId("saved-panel").getByTestId("saved-item")).toHaveCount(2);
  await expect(page.getByTestId("explore-results").getByTestId("save-button").first()).toHaveText("Saved");

  await search(page, PAPER);
  const first = page.getByTestId("explore-result").filter({ hasText: PAPER }).getByTestId("result-actions").first();
  await expect(first.getByTestId("cite-status")).toHaveText("");
  await first.getByTestId("cite-button").click();
  await expect(first.getByTestId("cite-status")).toHaveText("Citation copied.");
  const shown = (await first.getByTestId("cite-text").textContent())!;
  expect(shown).toContain("Samuel Eilenberg");
  expect(shown).toContain("https://doi.org/10.1090/");
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(shown);
  await first.getByTestId("reference-button").click();
  await expect(first.getByTestId("cite-status")).toHaveText("Copied for your reference manager.");
  expect(await page.evaluate(() => navigator.clipboard.readText())).toMatch(/^@(article|book|misc)\{/);

  await page.getByTestId("saved-panel").getByRole("button", { name: /^Remove: / }).first().click();
  await expect(page.getByTestId("saved-panel").getByTestId("saved-item")).toHaveCount(1);

  const [download] = await Promise.all([page.waitForEvent("download"), page.getByTestId("saved-download").click()]);
  expect(download.suggestedFilename()).toMatch(/^bucket-saved-\d{4}-\d{2}-\d{2}/);
  const body = JSON.parse(fs.readFileSync((await download.path())!, "utf8"));
  expect(body.kind).toBe("bucket.explore.saved");
  expect(body.version).toBe(1);
  expect(body.items).toHaveLength(1);
  expect(body.items[0].citation.length).toBeGreaterThan(10);

  const stored = await page.evaluate(() => JSON.parse(window.localStorage.getItem("bucket.explore.saved.v1")!));
  expect(stored.v).toBe(1);
  expect(stored.items).toHaveLength(1);
});

test("a result with no author offers Save and no Cite", async ({ page }) => {
  await open(page);
  const excerpt = page.getByTestId("explore-result").filter({ hasText: /^Talk · \d+ passages?/ }).first();
  await expect(excerpt.getByTestId("save-button")).toBeVisible();
  await expect(excerpt.getByTestId("cite-button")).toHaveCount(0);
  await excerpt.getByTestId("save-button").click();
  await expect(page.getByTestId("saved-panel").getByTestId("saved-item")).toContainText("No author is listed for this item");
});

test("a damaged stored value leaves the page working and is never written over", async ({ page }) => {
  await page.addInitScript(() => window.localStorage.setItem("bucket.explore.saved.v1", "{not a list"));
  await open(page);
  const panel = page.getByTestId("saved-panel");
  await expect(panel).toContainText("Nothing saved yet");
  await expect(panel.getByTestId("saved-blocked")).toBeVisible();
  await page.getByTestId("explore-results").getByTestId("save-button").first().click();
  await expect(panel.getByTestId("saved-item")).toHaveCount(1);
  expect(await page.evaluate(() => window.localStorage.getItem("bucket.explore.saved.v1"))).toBe("{not a list");
});

test("a planted script link in the stored value never reaches the page", async ({ page }) => {
  await page.addInitScript(() =>
    window.localStorage.setItem(
      "bucket.explore.saved.v1",
      JSON.stringify({ v: 1, noticeSeen: true, items: [{ id: "x", kind: "paper", title: "Planted", authors: "A", year: 2000, citation: "A (2000). Planted.", url: "javascript:window.__planted=1", savedAt: "2026-10-01T00:00:00.000Z" }] }),
    ),
  );
  await open(page);
  await expect(page.getByTestId("saved-panel")).toContainText("Nothing saved yet");
  await expect(page.locator('a[href^="javascript:"]')).toHaveCount(0);
});

test("a save in a second tab shows in the first and neither tab loses the other's save", async ({ context }) => {
  const one = await context.newPage();
  const two = await context.newPage();
  await open(one);
  await open(two);
  await one.getByTestId("explore-results").getByTestId("save-button").nth(0).click();
  await expect(two.getByTestId("saved-panel").getByTestId("saved-item")).toHaveCount(1);
  await two.getByTestId("explore-results").getByTestId("save-button").nth(1).click();
  await expect(one.getByTestId("saved-panel").getByTestId("saved-item")).toHaveCount(2);
  await expect(two.getByTestId("saved-panel").getByTestId("saved-item")).toHaveCount(2);
});

test("with storage blocked the page still works and says saves will not last", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.addInitScript(() => {
    Object.defineProperty(window, "localStorage", {
      get() {
        throw new DOMException("blocked", "SecurityError");
      },
    });
  });
  await open(page);
  const panel = page.getByTestId("saved-panel");
  await expect(panel.getByTestId("saved-blocked")).toContainText("This browser is not keeping saves.");
  await page.getByTestId("explore-results").getByTestId("save-button").first().click();
  await expect(panel.getByTestId("saved-item")).toHaveCount(1);
  await expect(panel.getByTestId("saved-notice")).toHaveCount(0);
  await expect(page.getByTestId("saved-download")).toBeVisible();
  expect(errors).toEqual([]);
});
