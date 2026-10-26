import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { emptyState, normalizeState } from "../src/lib/academy/engine";
import { HITS_TO_HIDE_NAME, flagHits, flagMissCount, flagShowsName, gradeFlagMatch, recordingFlagHit } from "../src/lib/academy/flag-misses";
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
