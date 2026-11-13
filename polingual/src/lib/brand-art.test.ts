import { test } from "node:test";
import assert from "node:assert/strict";
import { JSDOM } from "jsdom";
import { ART_DATA } from "../ui/art/data";
import { artSvg, type ArtName } from "../ui/art";
import { HERO_PIECES, OBJECT_PIECES, PIECES } from "../ui/art/brand";

const parse = (svg: string) => new JSDOM(svg, { contentType: "image/svg+xml" }).window.document;

function valid(svg: string, name: string) {
  const doc = parse(svg);
  assert.equal(doc.getElementsByTagName("parsererror").length, 0, `${name} parses`);
  const root = doc.documentElement;
  assert.equal(root.tagName, "svg", `${name} root`);
  const vb = root.getAttribute("viewBox") ?? "";
  const nums = vb.split(" ").map(Number);
  assert.equal(nums.length, 4, `${name} viewBox`);
  assert.ok(nums.every(Number.isFinite) && nums[2] > 0 && nums[3] > 0, `${name} viewBox size`);
}

test("every art name yields valid svg with a viewBox", () => {
  for (const d of ART_DATA) valid(artSvg(d.name as ArtName), d.name);
});

test("brand library holds 27 hero pieces and 56 objects, all valid", () => {
  assert.equal(HERO_PIECES.length, 27);
  assert.equal(OBJECT_PIECES.length, 56);
  for (const p of PIECES) valid(p.svg, p.id);
});

import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { unzipSync } from "fflate";
import DesignRedirect from "../app/(site)/design/[[...rest]]/page";
import PlayKitRedirect from "../app/(site)/play-kit/page";

function redirectsTo(fn: () => unknown, target: string) {
  try {
    fn();
  } catch (e) {
    const digest = String((e as { digest?: string }).digest ?? "");
    assert.match(digest, /^NEXT_REDIRECT/);
    assert.ok(digest.includes(target), `${digest} points at ${target}`);
    return;
  }
  assert.fail(`no redirect to ${target}`);
}

test("design and play-kit redirect into /brand", () => {
  redirectsTo(DesignRedirect, "/brand#screens");
  redirectsTo(PlayKitRedirect, "/brand#artwork");
});

test("the press kit zip holds all 83 artwork svgs", () => {
  const zip = unzipSync(readFileSync(join(__dirname, "../../public/brand/polingual-press-kit.zip")));
  const svgs = Object.keys(zip).filter((k) => /artwork\/svg\/.+\.svg$/.test(k));
  assert.equal(svgs.length, 83);
  assert.equal(Object.keys(zip).filter((k) => /artwork\/png\/.+\.png$/.test(k)).length, 166);
});

test("brand sources carry no hex literals", () => {
  const dir = join(__dirname, "../app/(site)/brand");
  for (const f of readdirSync(dir).filter((n) => /\.(tsx?|css)$/.test(n))) {
    const src = readFileSync(join(dir, f), "utf8");
    assert.ok(!/#[0-9a-f]{3,8}\b/i.test(src.replace(/href=\{?`?["']?#[a-z-]+/g, "").replace(/`#\$\{id\}`/g, "").replace(/url\(#\$\{id\}\)/g, "")), `${f} has a hex literal`);
  }
});
