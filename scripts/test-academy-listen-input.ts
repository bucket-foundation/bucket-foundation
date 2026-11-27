import test from "node:test";
import assert from "node:assert/strict";
import { parseProps } from "../src/lib/academy/events";
import type { InputItem } from "../src/lib/academy/input-selector";
import { audioCoverage, clipExposure, radioExposures } from "../src/lib/academy/listen-input";
import { countsAsInput, inputSeconds, type MetricRow } from "../src/lib/academy/progress-metric";

const T0 = Date.UTC(2026, 10, 26, 9);
const know = (l: string) => (l === "zz" ? 0 : 1);
const caption = (id: string, lemmas: string[], kind: InputItem["kind"] = "audio"): InputItem => ({
  id, kind, lang: "es", lemmas, tokens: lemmas.map((l) => ({ surface: l, lemma: l })), text: lemmas.join(" "),
});
const asRows = (rows: ReturnType<typeof radioExposures>): MetricRow[] => rows.map((r) => ({ kind: "exposure", lang: "es", reviewed_at: T0, ...r }));

test("radio with no captions logs the time and counts none of it", () => {
  const rows = radioExposures("9617a958-0601-11e8-ae97-52543be04c81", T0, 600_000, know);
  assert.equal(rows.length, 1);
  assert.equal(rows[0].seconds, 600);
  assert.equal(rows[0].coverage_pred, 0);
  assert.deepEqual(rows[0].lemmas_seen, []);
  assert.equal(inputSeconds(asRows(rows), "es"), 0);
  assert.ok(rows.every((r) => parseProps("exposure", r).ok));
});

test("captioned radio counts when predicted coverage reaches 0.9", () => {
  const cap = { items: [caption("c1", Array.from({ length: 19 }, (_, i) => `w${i}`).concat("zz"))] };
  const rows = radioExposures("st", T0, 120_000, know, cap);
  assert.equal(rows[0].coverage_pred, 0.95);
  assert.ok(countsAsInput(asRows(rows)[0], "es"));
  const low = radioExposures("st", T0, 120_000, know, { items: [caption("c2", ["a", "zz"])] });
  assert.equal(low[0].coverage_pred, 0.5);
  assert.equal(inputSeconds(asRows(low), "es"), 0);
});

test("long listening splits into rows the event gate accepts", () => {
  const rows = radioExposures("st", T0, 2.5 * 3_600_000, know);
  assert.deepEqual(rows.map((r) => r.seconds), [3600, 3600, 1800]);
  assert.equal(new Set(rows.map((r) => r.item)).size, 3);
  assert.ok(rows.every((r) => parseProps("exposure", r).ok));
  assert.deepEqual(radioExposures("st", T0, 400, know), []);
});

test("station ids with odd characters still make valid keys", () => {
  const [r] = radioExposures("a b/c?d", T0, 60_000, know);
  assert.ok(parseProps("exposure", r).ok);
  assert.equal(r.unit, "radio:a-b/c-d");
  assert.equal(r.item, `radio:a-b/c-d:${Math.floor(T0 / 1000)}.0`);
});

test("a captioned clip counts by its own coverage and skips non-audio items", () => {
  const clip = caption("clip-1", Array.from({ length: 10 }, (_, i) => `w${i}`));
  const row = clipExposure(clip, 45_400, true, know)!;
  assert.equal(row.seconds, 45);
  assert.equal(row.coverage_pred, 1);
  assert.equal(row.completed, true);
  assert.ok(parseProps("exposure", row).ok);
  assert.equal(clipExposure(caption("s", ["a"], "sentence"), 10_000, true, know), null);
  assert.equal(clipExposure(clip, 0, true, know), null);
});

test("audio coverage is the mean of clamped probabilities", () => {
  assert.equal(audioCoverage([], know), 0);
  assert.equal(audioCoverage(["a", "b", "zz", "zz"], (l) => (l === "a" ? 2 : l === "b" ? 1 : -1)), 0.5);
});
