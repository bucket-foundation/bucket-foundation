import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { siteVersion } from "../src/lib/site-version";
import { CANON_BRANCHES } from "../src/lib/contribute";

const root = path.join(__dirname, "..");
const read = (p: string) => fs.readFileSync(path.join(root, p), "utf8");
const HEADER = read("src/components/HeaderV3.tsx");
const FOOTER = read("src/components/FooterV3.tsx");
const LAYOUT = read("src/app/layout.tsx");
const PRESENTATION = read("src/components/Presentation.tsx");

test("research os is one link with no dropdown", () => {
  const item = HEADER.slice(HEADER.indexOf('label: "Research OS"') - 40, HEADER.indexOf('label: "Research OS"') + 60);
  assert.doesNotMatch(item, /sub:/);
  assert.doesNotMatch(HEADER, /research-os\/workspace/);
});

test("header nav lists Download right after Research OS and keeps the button", () => {
  assert.ok(HEADER.indexOf('label: "Research OS"') < HEADER.indexOf('label: "Download"'));
  assert.ok(HEADER.indexOf('label: "Download"') < HEADER.indexOf('label: "Canon"'));
  assert.match(HEADER, /href="\/download"/);
});

test("footer links Download and drops the dead links", () => {
  assert.match(FOOTER, /href="\/download"/);
  assert.doesNotMatch(FOOTER, /canon\/timeline/);
  assert.doesNotMatch(FOOTER, /\/kruse/);
  assert.doesNotMatch(FOOTER, /v0\.\d+\.\d+/);
  assert.match(FOOTER, /<FooterVersion \/>/);
});

test("the layout uses the V3 chrome and one branch count", () => {
  assert.match(LAYOUT, /components\/HeaderV3/);
  assert.match(LAYOUT, /components\/FooterV3/);
  assert.match(LAYOUT, /String\(CANON_BRANCHES\.length\)/);
  assert.doesNotMatch(LAYOUT, /story protocol|IP NFT|Eight branches/i);
  assert.equal(CANON_BRANCHES.length, 7);
});

test("the home hero links Download", () => {
  assert.match(PRESENTATION, /href="\/download"/);
});

test("originals stay untouched", () => {
  assert.ok(fs.existsSync(path.join(root, "src/components/Header.tsx")));
  assert.ok(fs.existsSync(path.join(root, "src/components/Footer.tsx")));
  assert.match(read("src/components/Footer.tsx"), /v0\.2\.0/);
});

test("siteVersion prefers the release tag and falls back to package.json", () => {
  assert.equal(siteVersion("bkt-v0.4.0", "0.2.0"), "v0.4.0");
  assert.equal(siteVersion(undefined, "0.2.0"), "v0.2.0");
  assert.equal(siteVersion(null, "0.2.0"), "v0.2.0");
});

test("the header branch list comes from CANON_BRANCHES", () => {
  assert.match(HEADER, /const CANON = CANON_BRANCHES\.map/);
  assert.doesNotMatch(HEADER, /slug: "earth"/);
});
