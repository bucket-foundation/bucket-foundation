import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join } from "node:path";

const root = join(__dirname, "../..");
const d8 = join(root, "public/d8");
const pages = readdirSync(d8).filter((f) => f.endsWith(".html"));
const groups = ["", ...readdirSync(join(root, "src/app")).filter((d) => /^\(.+\)$/.test(d))];

for (const page of pages) {
  const html = readFileSync(join(d8, page), "utf8");
  const hrefs = [...html.matchAll(/<a\b[^>]*\bhref="([^"]*)"/g)].map((m) => m[1]);

  test(`${page} has no dead anchors`, () => {
    for (const href of hrefs) assert.ok(href !== "" && !href.startsWith("#"), `${page}: href="${href}"`);
  });

  test(`${page} internal links resolve to a route`, () => {
    for (const href of hrefs.filter((h) => h.startsWith("/") && h !== "/")) {
      const route = href.split(/[?#]/)[0].replace(/^\//, "");
      const ok = groups.some((g) => existsSync(join(root, "src/app", g, route, "page.tsx"))) || existsSync(join(root, "public", route));
      assert.ok(ok, `${page}: ${href} has no page`);
    }
  });
}
