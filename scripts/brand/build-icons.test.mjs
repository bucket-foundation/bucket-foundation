import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { PRODUCTS, badgeLabel, badgeOverlay, compose, icns, ico, parseSource } from "./build-icons.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const read = (rel) => readFileSync(path.join(root, rel), "utf8");

test("each product has one source with a ground and a square box", () => {
  for (const product of Object.values(PRODUCTS)) {
    const src = parseSource(read(product.source));
    assert.match(src.ground, /^#[0-9A-F]{6}$/);
    assert.ok(src.box > 0);
    assert.ok(src.inner.includes(src.groundTag));
  }
});

test("no output path is claimed twice", () => {
  const paths = Object.values(PRODUCTS).flatMap((p) => p.targets.map((t) => t.path));
  assert.equal(new Set(paths).size, paths.length);
});

test("the lock lists every target and nothing else", () => {
  const lock = JSON.parse(read("brand/logo/icons.lock.json"));
  for (const [name, product] of Object.entries(PRODUCTS)) {
    assert.deepEqual(Object.keys(lock[name].outputs).sort(), product.targets.map((t) => t.path).sort());
    for (const t of product.targets) assert.ok(existsSync(path.join(root, t.path)), t.path);
  }
});

test("a source without a ground is refused", () => {
  assert.throws(() => parseSource('<svg viewBox="0 0 10 10"><path d="M0 0"/></svg>'), /ground/);
  assert.throws(() => parseSource('<svg viewBox="0 0 10 20"><rect id="ground" fill="#000000"/></svg>'), /square/);
});

test("foreground drops the ground and rounded clips by the source radius", () => {
  const src = parseSource('<svg viewBox="0 0 100 100" data-radius="0.24"><rect id="ground" width="100" height="100" fill="#5B1A4A"/><path d="M1 1"/></svg>');
  assert.ok(!compose(src, { shape: "foreground" }).includes('id="ground"'));
  assert.ok(compose(src, { shape: "rounded" }).includes('rx="24"'));
  assert.ok(compose(src, { shape: "circle" }).includes('r="50"'));
  assert.ok(compose(src, { shape: "square" }).includes('id="ground"'));
});

test("badge labels come from a date or a short code", () => {
  assert.equal(badgeLabel("2026-11-15"), "BETA 11.15");
  assert.equal(badgeLabel(true, new Date("2026-03-04T12:00:00Z")), "BETA 03.04");
  assert.equal(badgeLabel("b-42"), "B-42");
  assert.throws(() => badgeLabel("hello"), /badge supports/);
  assert.ok(badgeOverlay("BETA 11.15", "square").includes('fill="#161616"'));
});

test("ico and icns containers carry every image", () => {
  const png = Buffer.from([1, 2, 3]);
  const i = ico([{ size: 16, png }, { size: 32, png }]);
  assert.equal(i.readUInt16LE(4), 2);
  assert.equal(i.length, 6 + 32 + 6);
  const n = icns([{ type: "ic07", png }]);
  assert.equal(n.toString("ascii", 0, 4), "icns");
  assert.equal(n.readUInt32BE(4), n.length);
});
