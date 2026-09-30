import { test, expect } from "@playwright/test";
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

const TOOL = path.join(__dirname, "..", "..", "tools", "prime-directions");
const FIX = path.join(TOOL, "tests", "fixtures");
let pageUrl = "";

test.beforeAll(() => {
  const dir = mkdtempSync(path.join(tmpdir(), "advisor-page-"));
  const lines = readFileSync(path.join(FIX, "people-synthetic.jsonl"), "utf8").trim().split("\n").map((l) => JSON.parse(l));
  lines[0] = { ...lines[0], email: "pub@example.edu", email_source: "official_directory", profile_url: "https://example.edu/a" };
  lines[1] = { ...lines[1], email: "hidden@example.edu", email_source: "scraped", profile_url: "javascript:alert(1)" };
  const people = path.join(dir, "people.jsonl");
  writeFileSync(people, lines.map((l) => JSON.stringify(l)).join("\n") + "\n");
  const dirs = path.join(dir, "dirs.tsv");
  writeFileSync(dirs, "alpha\tprotein folding\nbeta\tgraph learning agents\n");
  const out = path.join(dir, "review");
  execFileSync(process.env.PYTHON || "python3", ["-m", "prime_directions", "advisor-review", "--people", people, "--query", path.join(FIX, "statement-synthetic.md"),
    "--out", out, "--directions", dirs, "--k", "6", "--top", "30", "--label", "5", "--min-df", "2", "--max-df", "0.9", "--min-chars", "50"],
    { cwd: TOOL, env: { ...process.env, PRIME_DATA_ROOT: path.join(dir, "data") } });
  pageUrl = "file://" + path.join(out, "index.html");
});

test("url sanitizing and contact rule", async ({ page }) => {
  await page.goto(pageUrl);
  const r = await page.evaluate(() => {
    const a = (window as any).__advisorReview;
    return {
      js: a.safeUrl("javascript:alert(1)"), http: a.safeUrl("http://x.org"), https: a.safeUrl("https://x.org/p"),
      pub: a.contactOf({ email: "p@x.edu", email_public: true }), hidden: a.contactOf({ email: "h@x.edu", email_public: false, profile_url: "javascript:alert(1)" }),
      fallback: a.contactOf({ email: "h@x.edu", email_public: false, profile_url: "https://x.org/p" }),
    };
  });
  expect(r.js).toBe(""); expect(r.http).toBe(""); expect(r.https).toBe("https://x.org/p");
  expect(r.pub).toEqual({ kind: "email", value: "p@x.edu" });
  expect(r.hidden).toBeNull();
  expect(r.fallback).toEqual({ kind: "profile", value: "https://x.org/p" });
  const html = await page.content();
  expect(html).not.toContain('href="javascript:');
  expect(await page.locator('a[href="mailto:hidden@example.edu"]').count()).toBe(0);
});

test("stepping moves the selection through the current order", async ({ page }) => {
  await page.goto(pageUrl);
  await page.evaluate(() => { (document.querySelector(".more-filters") as HTMLDetailsElement).open = true; });
  await page.selectOption("#view", "all");
  const ids = await page.evaluate(() => (window as any).__advisorReview.visible().map((r: any) => r.id));
  expect(await page.evaluate(() => (window as any).__advisorReview.selected())).toBe(ids[0]);
  await page.click("#next");
  expect(await page.evaluate(() => (window as any).__advisorReview.selected())).toBe(ids[1]);
  await expect(page.locator("#tl")).toHaveAttribute("aria-valuetext", new RegExp("^2 of " + ids.length));
  await page.click("#prev");
  expect(await page.evaluate(() => (window as any).__advisorReview.selected())).toBe(ids[0]);
  await page.locator("#dirs button").first().focus();
  await page.keyboard.press("ArrowRight");
  expect(await page.evaluate(() => (window as any).__advisorReview.selected())).toBe(ids[0]);
  await page.evaluate(() => (document.activeElement as HTMLElement).blur());
  await page.keyboard.press("ArrowRight");
  expect(await page.evaluate(() => (window as any).__advisorReview.selected())).toBe(ids[1]);
});

test("a prime-direction chip keeps rows at or above the 75th percentile", async ({ page }) => {
  await page.goto(pageUrl);
  await page.evaluate(() => { (document.querySelector(".more-filters") as HTMLDetailsElement).open = true; });
  await page.selectOption("#view", "all");
  const before = await page.evaluate(() => (window as any).__advisorReview.visible().length);
  await page.locator("#dirs button").first().click();
  const kept = await page.evaluate(() => (window as any).__advisorReview.visible().map((r: any) => r.star_prime[0]));
  expect(kept.length).toBeGreaterThan(0);
  expect(kept.length).toBeLessThan(before);
  for (const v of kept) expect(v).toBeGreaterThanOrEqual(0.75);
  await expect(page.locator("#panel svg.radar")).toHaveCount(2);
  const label = await page.locator("#panel svg.radar").first().getAttribute("aria-label");
  expect(label).toMatch(/\d/);
});

test("scrolling over the chart steps people and a mini chart becomes the main view", async ({ page }) => {
  await page.goto(pageUrl);
  await page.evaluate(() => { (document.querySelector(".more-filters") as HTMLDetailsElement).open = true; });
  await page.selectOption("#view", "all");
  const ids = await page.evaluate(() => (window as any).__advisorReview.visible().map((r: any) => r.id));
  const box = await page.locator("#circle-wrap").boundingBox();
  await page.mouse.move(box!.x + box!.width / 2, box!.y + box!.height / 2);
  await page.mouse.wheel(0, 120);
  await expect.poll(() => page.evaluate(() => (window as any).__advisorReview.selected())).toBe(ids[1]);
  await page.waitForTimeout(150);
  await page.mouse.wheel(0, -120);
  await expect.poll(() => page.evaluate(() => (window as any).__advisorReview.selected())).toBe(ids[0]);
  await expect(page.locator(".minis button")).toHaveCount(3);
  await page.locator(".minis button").nth(1).click();
  expect(await page.evaluate(() => (window as any).__advisorReview.main())).toBe("prime");
  await expect(page.locator("#circle")).toBeHidden();
  const label = await page.locator("#main-radar svg").getAttribute("aria-label");
  expect(label).toContain("you:");
  expect(label).toContain("average of the current filters:");
  await page.locator(".minis button").nth(0).click();
  await expect(page.locator("#circle")).toBeVisible();
});

test("clicking a list card expands that person and scrolling switches the active person", async ({ page }) => {
  await page.goto(pageUrl);
  await page.click('[data-view="list"]');
  await expect(page.locator(".cards .card .minis")).toHaveCount(0);
  const second = page.locator(".cards .card").nth(1);
  const id = await second.getAttribute("data-id");
  await second.locator(".name").click();
  await expect(page.locator('[data-view="circle"]')).toHaveAttribute("aria-pressed", "true");
  expect(await page.evaluate(() => (window as any).__advisorReview.selected())).toBe(id);
  const ids = await page.evaluate(() => (window as any).__advisorReview.visible().map((r: any) => r.id));
  const box = await page.locator("#circle-wrap").boundingBox();
  await page.mouse.move(box!.x + box!.width / 2, box!.y + box!.height / 2);
  await page.mouse.wheel(0, 120);
  await expect.poll(() => page.evaluate(() => (window as any).__advisorReview.selected())).toBe(ids[ids.indexOf(id!) + 1]);
  await expect(page.locator('[data-view="one"]')).toHaveCount(0);
});
