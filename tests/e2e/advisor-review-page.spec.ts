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

async function wheelAt(page: any, deltaY: number, opts: {deltaMode?: number; ctrlKey?: boolean} = {}) {
  return page.evaluate(([dy, mode, ctrl]: [number, number, boolean]) => {
    const el = document.getElementById("circle-wrap")!;
    const ev = new WheelEvent("wheel", {deltaY: dy, deltaMode: mode, ctrlKey: ctrl, bubbles: true, cancelable: true});
    el.dispatchEvent(ev);
    return ev.defaultPrevented;
  }, [deltaY, opts.deltaMode ?? 0, opts.ctrlKey ?? false]);
}

test("line-mode wheel steps, ctrl-wheel passes through, a fling is bounded", async ({ page }) => {
  await page.goto(pageUrl);
  const sel = () => page.evaluate(() => (window as any).__advisorReview.selected());
  const ids = await page.evaluate(() => (window as any).__advisorReview.visible().map((r: any) => r.id));
  expect(await wheelAt(page, 3, {deltaMode: 1})).toBe(true);
  expect(await sel()).toBe(ids[1]);
  expect(await wheelAt(page, 120, {ctrlKey: true})).toBe(false);
  expect(await sel()).toBe(ids[1]);
  await page.waitForTimeout(300);
  for (let i = 0; i < 40; i++) await wheelAt(page, 60);
  expect(await sel()).toBe(ids[4]);
});

test("s, m and x set the decision for the active person", async ({ page }) => {
  await page.goto(pageUrl);
  const id = await page.evaluate(() => (window as any).__advisorReview.selected());
  await page.locator("#circle").focus();
  await page.keyboard.press("s");
  expect(await page.evaluate((i) => (window as any).__advisorReview.statusOf(i), id)).toBe("shortlist");
  await page.keyboard.press("x");
  expect(await page.evaluate((i) => (window as any).__advisorReview.statusOf(i), id)).toBe("skip");
});

test("decisions: shortlist, skip and a save-for-later bookmark with b as its key", async ({ page }) => {
  await page.goto(pageUrl);
  const buttons = page.locator("#panel .actions button");
  await expect(buttons).toHaveCount(3);
  await expect(buttons.nth(0)).toHaveText("Shortlist");
  await expect(buttons.nth(1)).toHaveText("Skip");
  await expect(buttons.nth(2)).toHaveAttribute("aria-label", "Save for later");
  const id = await page.evaluate(() => (window as any).__advisorReview.selected());
  await page.locator("#circle").focus();
  await page.keyboard.press("b");
  expect(await page.evaluate((i) => (window as any).__advisorReview.statusOf(i), id)).toBe("maybe");
  await expect(page.locator("#panel .actions button[data-set=maybe]")).toHaveAttribute("aria-pressed", "true");
});

test("sorts and filters: our-direction sort, strong-on filter and h-index floor", async ({ page }) => {
  await page.goto(pageUrl);
  const vis = () => page.evaluate(() => (window as any).__advisorReview.visible());
  await page.selectOption("#sort", "ours0");
  const sorted = await vis();
  for (let i = 1; i < sorted.length; i++) expect(sorted[i - 1].star_ours[0]).toBeGreaterThanOrEqual(sorted[i].star_ours[0]);
  expect(await page.evaluate(() => (window as any).__advisorReview.selected())).toBe(sorted[0].id);
  await page.selectOption("#sort", "rank");
  const all = (await vis()).length;
  await page.selectOption("#f-ours", "1");
  const strong = await vis();
  expect(strong.length).toBeLessThan(all);
  for (const r of strong) expect(r.star_ours[1]).toBeGreaterThanOrEqual(0.75);
  await expect(page.locator("#legend")).toContainText("average of the current filters");
  await page.locator(".minis button").nth(2).click();
  await expect(page.locator("#legend")).toContainText("median of the 200 closest");
});
