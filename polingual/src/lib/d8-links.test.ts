import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join } from "node:path";

const root = join(__dirname, "../..");
const d8 = join(root, "public/d8");
const pages = readdirSync(d8).filter((f) => f.endsWith(".html"));
const groups = ["", ...readdirSync(join(root, "src/app")).filter((d) => /^\(.+\)$/.test(d))];
const resolves = (dir: string, segs: string[]): boolean => {
  if (!segs.length) return existsSync(join(dir, "page.tsx"));
  if (!existsSync(dir)) return false;
  const [head, ...rest] = segs;
  const dynamic = readdirSync(dir).filter((d) => /^\[[^.\]]+\]$/.test(d));
  return [head, ...dynamic].some((d) => resolves(join(dir, d), rest));
};

for (const page of pages) {
  const html = readFileSync(join(d8, page), "utf8");
  const hrefs = [...html.matchAll(/<a\b[^>]*\bhref="([^"]*)"/g)].map((m) => m[1]);

  test(`${page} has no dead anchors`, () => {
    for (const href of hrefs) assert.ok(href !== "" && !href.startsWith("#"), `${page}: href="${href}"`);
  });

  test(`${page} internal links resolve to a route`, () => {
    for (const href of hrefs.filter((h) => h.startsWith("/") && h !== "/")) {
      const route = href.split(/[?#]/)[0].replace(/^\//, "");
      const ok = groups.some((g) => resolves(join(root, "src/app", g), route.split("/"))) || existsSync(join(root, "public", route));
      assert.ok(ok, `${page}: ${href} has no page`);
    }
  });
}
