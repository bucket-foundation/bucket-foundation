import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "fs";
import path from "path";
import { POLINGUAL_URL } from "../src/lib/brand";
import { EXPLORE_LINKS, SLIM_LINKS, SITE_LINKS, internalPaths } from "../src/lib/routes";
import sitemap from "../src/app/sitemap";

const read = (p: string) => fs.readFileSync(path.join(__dirname, "..", p), "utf8");
const CHROME = ["src/components/HeaderV3.tsx", "src/components/SiteFooter.tsx", "src/components/SiteFooter.tsx"];

test("header and footers take their links from routes.ts", () => {
  for (const f of CHROME) {
    const src = read(f);
    assert.match(src, /from "@\/lib\/routes"/, f);
    assert.doesNotMatch(src, /href="\/(?!")/, f);
    assert.doesNotMatch(src, /href="https?:/, f);
  }
});

test("Polingual uses POLINGUAL_URL in both footers", () => {
  assert.equal(EXPLORE_LINKS[0].href, POLINGUAL_URL);
  assert.equal(SLIM_LINKS[0].href, POLINGUAL_URL);
});

test("hrefs are unique within each list and every internal path is in the sitemap", () => {
  const urls = new Set(sitemap().map((e) => e.url.replace("https://www.bucket.foundation", "")));
  for (const p of internalPaths()) assert.ok(urls.has(p), p);
  assert.ok(SITE_LINKS.length > 30);
});

test("one site footer with slim and full variants, and page sources share <Sources>", () => {
  assert.ok(!fs.existsSync(path.join(__dirname, "..", "src/components/FooterV3.tsx")));
  const footer = read("src/components/SiteFooter.tsx");
  assert.match(footer, /variant === "slim"/);
  assert.match(footer, /variant === "full"/);
  for (const f of ["src/app/canon/graph/page.tsx", "src/app/excerpts/page.tsx", "src/app/sacred-history/page.tsx", "src/app/canon/bridges/detected/[slug]/page.tsx"]) {
    const src = read(f);
    assert.match(src, /<Sources>/, f);
    assert.doesNotMatch(src, /<footer/, f);
  }
});
