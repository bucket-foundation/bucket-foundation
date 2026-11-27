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
const ROUTES = read("src/lib/routes.ts");
const LAYOUT = read("src/app/layout.tsx");
const PRESENTATION = read("src/components/Presentation.tsx");

test("header holds the logo and the account menu", () => {
  assert.match(HEADER, /href=\{HOME_LINK\.href\}/);
  assert.match(HEADER, /<UserMenu /);
  assert.equal((HEADER.match(/href=/g) ?? []).length, 1);
  assert.doesNotMatch(HEADER, /Research OS|"\/canon"|whats-new|"\/about"|GitHubStarButton|aria-haspopup|mobile-drawer/);
});

test("footer keeps the links the header dropped", () => {
  for (const href of ["/research-os", "/canon", "/whats-new", "/about", "https://github.com/bucket-foundation"]) {
    assert.ok(ROUTES.includes(`"${href}"`) || ROUTES.includes("https://github.com/bucket-foundation"), href);
  }
});

test("footer links Polingual and drops the dead links", () => {
  assert.match(ROUTES, /href: POLINGUAL_URL/);
  assert.doesNotMatch(FOOTER + ROUTES, /canon\/timeline/);
  assert.doesNotMatch(FOOTER + ROUTES, /\/kruse/);
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

test("the home hero holds one action and the slim footer links Polingual", () => {
  assert.equal((PRESENTATION.match(/href=/g) ?? []).length, 1);
  assert.match(read("src/components/SiteFooter.tsx"), /SLIM_LINKS/);
  assert.match(ROUTES, /SLIM_LINKS: NavLink\[\] = \[\n  POLINGUAL_LINK/);
});

test("one logo source and no legacy chrome", () => {
  for (const f of ["Header.tsx", "HeaderV2.tsx", "Footer.tsx", "FooterV2.tsx", "InverseOmega.tsx", "Shield.tsx"]) assert.ok(!fs.existsSync(path.join(root, "src/components", f)), f);
  for (const f of ["logo.svg", "logo-512.png", "logo-180.png"]) assert.ok(fs.existsSync(path.join(root, "public/brand", f)), f);
  assert.ok(fs.existsSync(path.join(root, "public/favicon.ico")));
});

test("siteVersion prefers the release tag and falls back to package.json", () => {
  assert.equal(siteVersion("bkt-v0.4.0", "0.2.0"), "v0.4.0");
  assert.equal(siteVersion(undefined, "0.2.0"), "v0.2.0");
  assert.equal(siteVersion(null, "0.2.0"), "v0.2.0");
});

test("the user menu never shows a second Download button", () => {
  const menu = fs.readFileSync(path.join(process.cwd(), "src/components/auth/UserMenuV2.tsx"), "utf8");
  assert.ok(!/cta = closed \? "Download"/.test(menu));
  assert.ok(menu.includes('"Sign in"'));
});
