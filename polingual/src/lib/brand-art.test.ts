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
