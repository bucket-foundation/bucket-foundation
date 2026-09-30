import test from "node:test";
import assert from "node:assert/strict";
import atlas from "../src/lib/research-os/solvability-atlas-data.json";
import type { SolvabilityAtlasData } from "../src/lib/research-os/solvability-atlas";
import { SPACE_VIEWS } from "../src/lib/research-os/solvability-space";
import { BUCKETMATH_COLOR, ERA_LABEL_PX, branchColor, solvabilityLayout } from "../src/lib/research-os/solvability-scene";

const rows = (atlas as SolvabilityAtlasData).productions;

test("every view yields a scene layout with finite nodes for every visible production", () => {
  for (const v of SPACE_VIEWS) {
    const l = solvabilityLayout(rows, v, 2026, null);
    assert.equal(l.nodes.length, rows.length);
    for (const n of l.nodes) assert.ok(n.position.every(Number.isFinite), `${v} ${n.id}`);
    assert.ok(l.guides.length > 0);
    assert.ok(l.camera.every(Number.isFinite));
  }
});

test("the year slider hides problems posed later", () => {
  const l = solvabilityLayout(rows, "helix", 1950, null);
  assert.equal(l.nodes.length, rows.filter((p) => p.posed <= 1950).length);
});

test("selection labels the node and links it only to token neighbours", () => {
  const id = rows[0].id;
  const l = solvabilityLayout(rows, "circle", 2026, id);
  assert.equal(l.nodes.find((n) => n.id === id)?.label, rows[0].title);
  assert.ok(l.links.every((k) => k.from === id || k.to === id));
  assert.equal(solvabilityLayout(rows, "circle", 2026, null).links.length, 0);
});

test("branch colours come from the canon palette with a BucketMath fallback", () => {
  assert.match(branchColor("physics"), /^#[0-9A-F]{6}$/i);
  assert.equal(branchColor("bucketmath"), BUCKETMATH_COLOR);
});

test("era labels use a readable pixel size and nodes match the explore scale", () => {
  const l = solvabilityLayout(rows, "slices", 2026, null);
  const labels = l.guides.filter((g) => g.kind === "text");
  assert.ok(labels.length > 0 && labels.every((g) => g.kind === "text" && (g.size ?? 11) >= 9 && g.size === ERA_LABEL_PX));
  assert.ok(l.nodes.every((n) => n.size >= 0.02 && n.size <= 0.04));
  assert.ok(l.nodes.every((n) => Math.hypot(...n.position) < 3));
});
