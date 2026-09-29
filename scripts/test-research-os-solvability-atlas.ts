import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import atlas from "../src/lib/research-os/solvability-atlas-data.json";
import { BRANCHES, MINT_STATES, dialPoint, filterProductions, mintCounts, type SolvabilityAtlasData } from "../src/lib/research-os/solvability-atlas";

const data = atlas as SolvabilityAtlasData;

test("every production is a bucket production with a claim and a known mint state", () => {
  assert.equal(data.producer, "bucket.foundation");
  for (const p of data.productions) {
    assert.equal(p.kind, "production");
    assert.ok(p.claim.length > 20, p.id);
    assert.ok((MINT_STATES as readonly string[]).includes(p.mint_state), p.id);
    assert.ok((BRANCHES as readonly string[]).includes(p.branch), p.id);
    assert.ok(p.solvability >= 0 && p.solvability <= 1, p.id);
  }
});

test("BucketMath cards match the Lean manifest they claim", () => {
  const manifest = JSON.parse(readFileSync(path.join(__dirname, "..", "lean", "manifest.json"), "utf8")) as { name: string; status: string }[];
  const byName = new Map(manifest.map((t) => [t.name, t.status]));
  const lean = data.productions.filter((p) => p.source_kind === "lean");
  assert.ok(lean.length > 0);
  for (const p of lean) {
    const st = byName.get(p.title);
    assert.ok(st, p.title);
    assert.equal(p.mint_state === "minted", st === "proved", p.title);
  }
});

test("the page sits behind the launch gate", () => {
  const layout = readFileSync(path.join(__dirname, "..", "src", "app", "research-os", "(app)", "solvability", "layout.tsx"), "utf8");
  assert.match(layout, /gateLaunchPage\("\/research-os\/solvability"\)/);
});

test("counts add up and filters narrow", () => {
  const c = mintCounts(data.productions);
  assert.equal(c.minted + c.pending + c.draft + c.unminted, data.productions.length);
  const all = filterProductions(data.productions, { source: "problem", branch: "", mint: "" });
  const math = filterProductions(data.productions, { source: "problem", branch: "mathematics", mint: "minted" });
  assert.ok(all.length >= 70);
  assert.ok(math.length > 0 && math.every((p) => p.branch === "mathematics" && p.mint_state === "minted"));
});

test("the dial stays inside its box", () => {
  for (const p of data.productions) {
    const { x, y } = dialPoint(p.theta, p.solvability);
    assert.ok(x >= 0 && x <= 44 && y >= 0 && y <= 44, p.id);
  }
});
