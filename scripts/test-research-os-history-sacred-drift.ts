import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { SACRED_DIR } from "../src/lib/history/importer";
import { parseEdtf, parseYear } from "../src/lib/history/span";

const ROOT = path.join(__dirname, "..");
const rows = readFileSync(path.join(ROOT, SACRED_DIR, "timeline-events.jsonl"), "utf8")
  .split("\n")
  .filter((l) => l.trim())
  .map((l) => JSON.parse(l) as { id: string; wikidata: string; date: { value: string; precision: string } });
const raw = JSON.parse(readFileSync(path.join(ROOT, SACRED_DIR, "wikidata-sacred-events.json"), "utf8")) as {
  results: { bindings: { event: { value: string }; when: { value: string } }[] };
};
const published = JSON.parse(readFileSync(path.join(ROOT, "src/data/sacred-history.json"), "utf8")).timeline as { id: string; wikidata: string; year: number; precision: string }[];

const rawDates = new Map<string, string[]>();
for (const b of raw.results.bindings) {
  const qid = b.event.value.split("/").pop()!;
  rawDates.set(qid, [...(rawDates.get(qid) ?? []), b.when.value]);
}

test("the committed snapshot holds 106 raw bindings and 74 graph rows", () => {
  assert.equal(raw.results.bindings.length, 106);
  assert.equal(rows.length, 74);
  assert.equal(published.length, 21);
});

test("every graph row agrees with a raw Wikidata binding for its QID", () => {
  for (const r of rows) {
    const dates = rawDates.get(r.wikidata);
    assert.ok(dates, `${r.id}: ${r.wikidata} has no raw binding`);
    assert.ok(dates.some((d) => d.replace(/^\+/, "").startsWith(r.date.value)), `${r.id}: ${r.date.value} matches none of ${dates.join(", ")}`);
    assert.ok(parseEdtf(r.date.value).ok, `${r.id}: ${r.date.value} does not parse`);
  }
});

test("every published sacred-history year parses, and any the snapshot also dates agrees with it", () => {
  const snapshot = new Map(rows.map((r) => [r.wikidata, r]));
  let shared = 0;
  for (const e of published) {
    const own = parseYear(e.year, "historical");
    assert.ok(own.ok, `${e.id}: ${e.year}`);
    const s = snapshot.get(e.wikidata);
    if (!s) continue;
    shared++;
    const theirs = parseEdtf(s.date.value);
    assert.ok(theirs.ok);
    const slack = e.precision === "century" ? 100 : e.precision === "decade" ? 10 : 0;
    assert.ok(Math.abs(own.span.start_year - theirs.span.start_year) <= slack, `${e.id}: published ${e.year}, snapshot ${s.date.value}`);
  }
  assert.equal(shared, 0, "a published anchor now appears in the snapshot; review the drift pin");
});
