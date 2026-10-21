import test from "node:test";
import assert from "node:assert/strict";
import { ASPECT_IDS, DIRECTION_IDS, type AspectId, type DirectionId } from "../src/lib/brand-pick/directions";
import { mergeAnswers, normalizeNote, parseAnswer, NOTE_MAX, type Answer } from "../src/lib/brand-pick/answers";
import { bradleyTerry } from "../src/lib/brand-pick/rank";
import { allPairs, coverageOrder, nextCard, progress, rematches, stable, type Card } from "../src/lib/brand-pick/schedule";
import { buildResults, shareSummary } from "../src/lib/brand-pick/results";

const T0 = Date.parse("2026-10-20T00:00:00Z");

function answer(c: Pick<Card, "aspect" | "a" | "b" | "round" | "left">, choice: DirectionId | null, i: number, note = ""): Answer {
  return { aspect: c.aspect, a: c.a, b: c.b, round: c.round, left: c.left, choice, note, at: new Date(T0 + i * 1000).toISOString() };
}

function play(seed: number, pick: (c: Card) => DirectionId | null, limit = 1000): Answer[] {
  const out: Answer[] = [];
  for (let i = 0; i < limit; i++) {
    const c = nextCard(seed, out);
    if (!c) return out;
    out.push(answer(c, pick(c), i));
  }
  throw new Error("schedule did not finish");
}

const byIndex = (c: Card) => (c.a < c.b ? c.a : c.b);

test("coverage order holds all 21 pairs once per aspect, in a seed-dependent shuffle", () => {
  for (const aspect of ASPECT_IDS) {
    const order = coverageOrder(7, aspect);
    assert.equal(order.length, 21);
    assert.equal(new Set(order.map(([a, b]) => `${a}${b}`)).size, 21);
    for (const [a, b] of order) assert.ok(a < b);
  }
  assert.notDeepEqual(coverageOrder(7, "logo"), coverageOrder(8, "logo"));
  assert.deepEqual(coverageOrder(7, "logo"), coverageOrder(7, "logo"));
  assert.notDeepEqual(coverageOrder(7, "logo"), allPairs());
});

test("every direction meets every other at least once per aspect", () => {
  const out = play(42, byIndex);
  for (const aspect of ASPECT_IDS) {
    const met = new Set(out.filter((x) => x.aspect === aspect).map((x) => `${x.a}${x.b}`));
    for (const [a, b] of allPairs()) assert.ok(met.has(`${a}${b}`), `${aspect} ${a}-${b}`);
  }
});

test("both sides of the screen get used", () => {
  const out = play(3, byIndex);
  const leftIsA = out.filter((x) => x.left === x.a).length;
  assert.ok(leftIsA > out.length * 0.3 && leftIsA < out.length * 0.7, String(leftIsA));
});

test("a consistent chooser stops after the round robin with no rematches", () => {
  const out = play(11, byIndex);
  assert.equal(out.length, 21 * ASPECT_IDS.length);
  for (const aspect of ASPECT_IDS) assert.ok(stable(out, aspect));
  assert.equal(nextCard(11, out), null);
});

test("an inconsistent chooser gets rematches, capped, and the schedule still ends", () => {
  const pick = (c: Card): DirectionId => {
    const i = DIRECTION_IDS.indexOf(c.a);
    const j = DIRECTION_IDS.indexOf(c.b);
    return (j - i + 7) % 7 <= 3 ? c.a : c.b;
  };
  const out = play(5, pick);
  const extra = out.filter((x) => x.round > 0);
  assert.ok(extra.length > 0);
  for (const aspect of ASPECT_IDS) assert.ok(out.filter((x) => x.aspect === aspect && x.round > 0).length <= 6);
});

test("rematches wait for full coverage", () => {
  const out: Answer[] = [];
  const c = nextCard(1, out)!;
  out.push(answer(c, null, 0));
  assert.deepEqual(rematches(out, c.aspect), []);
});

test("skips count as a meeting, add no wins and ask for no rematch", () => {
  const out = play(9, () => null);
  assert.equal(out.length, 21 * ASPECT_IDS.length);
  const r = bradleyTerry(out);
  for (const x of r) assert.equal(x.wins + x.losses, 0);
});

test("progress counts answers against the round robin total", () => {
  const p0 = progress([], nextCard(1, []));
  assert.equal(p0.total, 21 * ASPECT_IDS.length);
  assert.equal(p0.aspectTotal, 21);
  const done = play(1, byIndex);
  assert.equal(progress(done, null).answered, done.length);
});

function games(list: [DirectionId, DirectionId][], aspect: AspectId = "overall"): Answer[] {
  return list.map(([w, l], i) => {
    const [a, b] = w < l ? [w, l] : [l, w];
    return answer({ aspect, a, b, round: 0, left: a }, w, i);
  });
}

test("Bradley-Terry orders a transitive round robin by wins", () => {
  const ids = [...DIRECTION_IDS];
  const list: [DirectionId, DirectionId][] = [];
  for (let i = 0; i < ids.length; i++) for (let j = i + 1; j < ids.length; j++) list.push([ids[i], ids[j]]);
  const r = bradleyTerry(games(list));
  assert.deepEqual(r.map((x) => x.id), ids);
  assert.equal(r[0].wins, 6);
  assert.equal(r[6].losses, 6);
  for (let i = 0; i + 1 < r.length; i++) assert.ok(r[i].strength > r[i + 1].strength);
});

test("Bradley-Terry is symmetric for a cycle and finite for an unbeaten item", () => {
  const cycle = bradleyTerry(games([["d1", "d2"], ["d2", "d3"], ["d3", "d1"]]), ["d1", "d2", "d3"]);
  for (const x of cycle) assert.ok(Math.abs(x.strength - cycle[0].strength) < 1e-6);
  const one = bradleyTerry(games([["d1", "d2"], ["d1", "d2"], ["d1", "d2"]]), ["d1", "d2"]);
  assert.ok(Number.isFinite(one[0].strength));
  assert.equal(one[0].id, "d1");
  assert.ok(one[0].score > 0.5 && one[1].score < 0.5);
});

test("Bradley-Terry matches the closed form for two items", () => {
  const r = bradleyTerry(games([["d1", "d2"], ["d1", "d2"], ["d2", "d1"]]), ["d1", "d2"]);
  const p1 = r.find((x) => x.id === "d1")!.strength;
  const p2 = r.find((x) => x.id === "d2")!.strength;
  const lhs1 = 2 + 0.5;
  const rhs1 = p1 * (3 / (p1 + p2) + 1 / (p1 + 1));
  assert.ok(Math.abs(lhs1 - rhs1) < 1e-6);
  const rhs2 = p2 * (3 / (p1 + p2) + 1 / (p2 + 1));
  assert.ok(Math.abs(1.5 - rhs2) < 1e-6);
});

test("the note is optional, trimmed and capped", () => {
  assert.equal(normalizeNote(undefined), "");
  assert.equal(normalizeNote("  calm  "), "calm");
  assert.equal(normalizeNote("x".repeat(NOTE_MAX + 50)).length, NOTE_MAX);
  const base = { aspect: "logo", a: "d1", b: "d2", round: 0, left: "d2", choice: "d1", at: "2026-10-20T00:00:00Z" };
  assert.equal(parseAnswer(base)?.note, "");
  assert.equal(parseAnswer({ ...base, note: " because " })?.note, "because");
  assert.equal(parseAnswer({ ...base, choice: null })?.choice, null);
});

test("parseAnswer rejects malformed answers", () => {
  const base = { aspect: "logo", a: "d1", b: "d2", round: 0, left: "d2", choice: "d1", note: "" };
  for (const bad of [null, {}, { ...base, aspect: "x" }, { ...base, a: "d2", b: "d1" }, { ...base, a: "d1", b: "d1" }, { ...base, choice: "d3" }, { ...base, left: "d4" }, { ...base, round: 9 }, { ...base, round: 0.5 }, { ...base, note: 4 }, { ...base, b: "d8" }]) {
    assert.equal(parseAnswer(bad), null, JSON.stringify(bad));
  }
});

test("merge keeps the newest answer per pair and round", () => {
  const old = answer({ aspect: "logo", a: "d1", b: "d2", round: 0, left: "d1" }, "d1", 0);
  const newer = { ...old, choice: "d2" as DirectionId, at: new Date(T0 + 5000).toISOString() };
  assert.deepEqual(mergeAnswers([newer], [old]), [newer]);
  assert.deepEqual(mergeAnswers([old], [newer]), [newer]);
});

test("results carry notes under both directions and a share summary", () => {
  const list = games([["d7", "d1"]], "logo");
  list[0].note = "the lyre";
  const res = buildResults(list);
  assert.equal(res.notes.d7[0].chose, true);
  assert.equal(res.notes.d1[0].chose, false);
  assert.equal(res.notes.d3.length, 0);
  assert.equal(res.overall[0].id, "d7");
  const s = shareSummary(res, "2026-10-20");
  assert.match(s, /Overall: 1\. Euclid/);
  assert.match(s, /logo and mark: Euclid/);
  assert.match(s, /- the lyre/);
});
