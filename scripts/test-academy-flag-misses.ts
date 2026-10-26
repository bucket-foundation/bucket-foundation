import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { emptyState, mergeState, normalizeState } from "../src/lib/academy/engine";
import { HITS_TO_HIDE_NAME, flagHits, flagMissCount, flagShowsName, gradeFlagMatch, gradeWebMatch, mergeFlagTables, recordingFlagHit, withFlagTables } from "../src/lib/academy/flag-misses";
import { gradeMatch } from "../src/lib/academy/lang-systems";

const FIXTURES = path.join(process.cwd(), "apple/BucketKit/Tests/BucketKitTests/Fixtures/lang");
const pairs = [{ lang: "fr", word: "nuit" }, { lang: "es", word: "noche" }, { lang: "it", word: "notte" }];

type Case = { name: string; hits: Record<string, number>; misses: Record<string, number>; assign: Record<string, string> };

function row(c: Case): string[] {
  const start = emptyState();
  start.settings = { ...start.settings, flagHits: c.hits, flagMisses: c.misses };
  const r = gradeFlagMatch(pairs, c.assign, start);
  const sorted = (t: Record<string, number> = {}) => Object.keys(t).sort().map((k) => `${k}=${t[k]}`).join(",");
  return [c.name, r.ratings.map((x) => `${x.lang}=${x.rating ?? "none"}`).join(","), sorted(r.state.settings.flagHits), sorted(r.state.settings.flagMisses), pairs.map((p) => `${p.lang}=${flagShowsName(r.state, p.lang)}`).join(",")];
}

const cases = JSON.parse(fs.readFileSync(path.join(FIXTURES, "flag-match-cases.json"), "utf8")) as Case[];

test("web flag grading matches the golden recorded from Swift FlagMisses.gradeMatch", () => {
  const golden = JSON.parse(fs.readFileSync(path.join(FIXTURES, "flag-match-golden.json"), "utf8")) as string[][];
  assert.equal(golden.length, cases.length);
  assert.deepEqual(cases.map(row), golden);
});

test("a miss on a nameless flag leaves the word unrated, counts against that flag and brings its name back", () => {
  let st = emptyState();
  for (let i = 0; i < HITS_TO_HIDE_NAME; i++) st = recordingFlagHit(st, "it");
  assert.ok(!flagShowsName(st, "it") && flagShowsName(st, "fr"));
  const out = gradeFlagMatch(pairs, { fr: "it", it: "fr", es: "es" }, st);
  assert.deepEqual(out.ratings, [{ lang: "fr", rating: null }, { lang: "es", rating: 3 }, { lang: "it", rating: 1 }]);
  assert.equal(flagMissCount(out.state, "it"), 1);
  assert.equal(flagHits(out.state, "it"), 0);
  assert.ok(flagShowsName(out.state, "it"));
});

test("with every name shown, flag grading equals gradeMatch", () => {
  for (const assign of [{ fr: "fr", es: "es", it: "it" }, { fr: "es", es: "fr", it: "it" }, { fr: "it", es: "fr", it: "es" }]) {
    const plain = gradeMatch(pairs, assign).map((r) => (r.correct ? 3 : 1));
    assert.deepEqual(gradeFlagMatch(pairs, assign, emptyState()).ratings.map((r) => r.rating), plain);
  }
});

test("flag counters survive a save and reload of the engine state", () => {
  const graded = gradeFlagMatch(pairs, { fr: "fr", es: "es", it: "it" }, emptyState()).state;
  const reloaded = normalizeState(JSON.parse(JSON.stringify(graded)));
  assert.deepEqual(reloaded.settings.flagHits, { fr: 1, es: 1, it: 1 });
  assert.equal(flagHits(reloaded, "fr"), 1);
});

test("grading leaves the input state untouched", () => {
  const st = emptyState();
  gradeFlagMatch(pairs, { fr: "fr", es: "es", it: "it" }, st);
  assert.equal(st.settings.flagHits, undefined);
});

test("per flag the side with more misses wins its pair, equal misses take the higher hits, one-sided flags stay", () => {
  const a = { flagHits: { fr: 0, es: 1, de: 4 }, flagMisses: { fr: 2, es: 1 } };
  const b = { flagHits: { fr: 5, es: 3, it: 3 }, flagMisses: { fr: 1, es: 1 } };
  const m = mergeFlagTables(a, b);
  assert.deepEqual(m, { flagHits: { fr: 0, es: 3, de: 4, it: 3 }, flagMisses: { fr: 2, es: 1 } });
  assert.deepEqual(mergeFlagTables(b, a), m);
});

test("two devices grade apart; a reset after a miss on one device brings the name back after sync", () => {
  let phone = emptyState();
  let laptop = emptyState();
  phone = gradeFlagMatch(pairs, { fr: "fr", es: "es", it: "it" }, phone).state;
  phone = gradeFlagMatch(pairs, { fr: "fr", es: "es", it: "it" }, phone).state;
  for (let i = 0; i < HITS_TO_HIDE_NAME; i++) laptop = recordingFlagHit(laptop, "it");
  laptop = gradeFlagMatch(pairs, { fr: "it", it: "fr", es: "es" }, laptop).state;
  const synced = mergeState(phone, laptop);
  assert.deepEqual(synced.settings.flagHits, { fr: 2, es: 2, it: 0 });
  assert.deepEqual(synced.settings.flagMisses, { it: 1 });
  assert.ok(flagShowsName(synced, "it"));
  assert.deepEqual(mergeState(laptop, phone).settings, synced.settings);
  const golden = JSON.parse(fs.readFileSync(path.join(FIXTURES, "flag-merge-golden.json"), "utf8"));
  const tables = (st: typeof phone) => ({ flagHits: st.settings.flagHits ?? {}, flagMisses: st.settings.flagMisses ?? {} });
  assert.deepEqual(tables(phone), golden.a);
  assert.deepEqual(tables(laptop), golden.b);
  assert.deepEqual(tables(synced), golden.synced);
  assert.deepEqual(mergeFlagTables(golden.a, golden.b), golden.synced);
});

test("mergeState merges flag tables per flag instead of replacing the table", () => {
  const a = withFlagTables(emptyState(), { flagHits: { fr: 3 }, flagMisses: {} });
  const b = withFlagTables(emptyState(), { flagHits: { es: 1 }, flagMisses: {} });
  const m = mergeState(a, b);
  assert.deepEqual(m.settings.flagHits, { fr: 3, es: 1 });
  assert.deepEqual(mergeState(b, a).settings.flagHits, { fr: 3, es: 1 });
});

test("web match cards show names, so a wrong pick rates 1 and records no miss even on a flag iOS shows nameless", () => {
  let st = emptyState();
  for (let i = 0; i < HITS_TO_HIDE_NAME; i++) st = recordingFlagHit(st, "it");
  const { results, tables } = gradeWebMatch(pairs, { fr: "it", it: "fr", es: "es" }, st);
  assert.deepEqual(results, [{ lang: "fr", rating: 1 }, { lang: "es", rating: 3 }, { lang: "it", rating: 1 }]);
  assert.deepEqual(tables.flagMisses, {});
  assert.deepEqual(tables.flagHits, { it: 3, es: 1 });
});

test("three right web matches hide the name the iOS app reads from the same set state", () => {
  let st = emptyState();
  for (let n = 0; n < HITS_TO_HIDE_NAME; n++) st = withFlagTables(st, gradeWebMatch(pairs, { fr: "fr", es: "es", it: "it" }, st).tables);
  for (const p of pairs) assert.equal(flagShowsName(st, p.lang), false, p.lang);
  const ios = gradeFlagMatch(pairs, { fr: "es", es: "fr", it: "it" }, st);
  assert.deepEqual(ios.ratings.map((r) => r.rating), [null, null, 3]);
});

test("a web grader given the iOS visibility rule drops unrated words from the results", () => {
  let st = emptyState();
  for (let i = 0; i < HITS_TO_HIDE_NAME; i++) st = recordingFlagHit(st, "it");
  const { results, tables } = gradeWebMatch(pairs, { fr: "it", it: "fr", es: "es" }, st, (l) => flagShowsName(st, l));
  assert.deepEqual(results.map((r) => r.lang), ["es", "it"]);
  assert.deepEqual(tables.flagMisses, { it: 1 });
});
