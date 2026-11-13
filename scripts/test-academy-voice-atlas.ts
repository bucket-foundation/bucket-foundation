import test from "node:test";
import assert from "node:assert/strict";
import { ATLAS_HOMES, ATLAS_MAX, atlasGhosts, atlasPoints, atlasRounds, distanceKm, nearestHome } from "../src/lib/academy/voice-atlas";

const langs = Object.keys(ATLAS_HOMES);
const items = Array.from({ length: 80 }, (_, n) => {
  const forms: Record<string, string> = { en: `en${n}` };
  for (const l of langs) forms[l] = `${l}${n}`;
  return { id: `w${n}`, kind: "word", category: "food", gloss: `en${n}`, forms };
}) as any[];

test("daily rounds use six distinct languages and are fixed per date", () => {
  const a = atlasRounds(items, "2026-11-13");
  assert.equal(a.length, 6);
  assert.equal(new Set(a.map((r) => r.lang)).size, 6);
  assert.deepEqual(atlasRounds(items, "2026-11-13"), a);
  assert.ok(a.every((r) => items.find((i) => i.id === r.itemId).forms[r.lang] === r.form));
});

test("distance and points", () => {
  assert.ok(Math.abs(distanceKm([48.9, 2.4], [51.5, -0.1]) - 340) < 20);
  assert.equal(nearestHome("pt", [-22.9, -43.2])?.home[0], -23.5);
  assert.equal(nearestHome("xx", [0, 0]), null);
  assert.equal(atlasPoints(0), ATLAS_MAX);
  assert.ok(atlasPoints(1000) < ATLAS_MAX && atlasPoints(1000) > atlasPoints(5000));
  assert.ok(atlasPoints(20000) < 50);
});

test("ghosts are fixed per day and sorted", () => {
  const g = atlasGhosts("2026-11-13");
  assert.deepEqual(atlasGhosts("2026-11-13"), g);
  assert.ok(g.every((x, i) => i === 0 || g[i - 1].score >= x.score));
});
