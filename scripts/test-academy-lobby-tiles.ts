import test from "node:test";
import assert from "node:assert/strict";
import { buildPrompts, normalizeLobbyConfig, seededRandom, tileAnswerDecision, visiblePrompts, type LobbyRow } from "../src/lib/academy/lobbies";
import { botTileChoice, STANDING_SLOTS, tileSubmitMs } from "../src/lib/academy/lobby-bots";
import { revealEntries } from "../src/lib/academy/lobby-reveal";
import {
  buildTilePrompts,
  comboMultiplier,
  parseTapped,
  parseTile,
  tappedChoice,
  tileCount,
  tileHistory,
  tileOutcome,
  tilePoints,
  tileSchedule,
  TILE_LIVES,
  TILE_MAX,
  TILE_MIN,
  TILE_SUBMIT_AT,
} from "../src/lib/academy/lobby-tiles";

const T0 = Date.parse("2026-11-12T10:00:00.000Z");
const LANGS = ["es", "fr", "it", "pt", "de"];

function word(i: number): any {
  const forms: Record<string, string> = { en: `en${i}` };
  for (const l of LANGS) forms[l] = `${l}${i}`;
  return { id: `w${i}`, kind: "word", category: "c", gloss: `en${i}`, forms, readings: { es: { roman: `r${i}` } } };
}

const ITEMS = Array.from({ length: 80 }, (_, i) => word(i));
const lookup = (lang: string, form: string) => ITEMS.filter((i) => i.forms[lang] === form);

function lobby(over: Partial<LobbyRow> = {}): LobbyRow {
  return { id: "L", code: "ABC123", host_id: "h", name: "T", game: "tiles", root: "en", targets: ["es", "fr", "it"], seed: "11", status: "playing", listed: true, rounds: 10, round_seconds: 6, started_at: new Date(T0).toISOString(), version: 1, created_at: new Date(T0).toISOString(), ...over };
}

test("tiles is a lobby game", () => {
  assert.equal(normalizeLobbyConfig({ root: "en", targets: ["es"], game: "tiles", roundSeconds: 6 })?.game, "tiles");
  assert.ok(STANDING_SLOTS.some((s) => s.game === "tiles"));
});

test("tile prompts ramp up, hide nothing the server needs, and mark every right tile", () => {
  const rows = buildPrompts(ITEMS, lobby(), LANGS);
  assert.equal(rows.length, 10);
  assert.deepEqual(rows, buildPrompts(ITEMS, lobby(), LANGS));
  assert.equal(rows[0].choices.length, TILE_MIN);
  assert.equal(rows[9].choices.length, TILE_MAX);
  for (const r of rows) {
    assert.equal(r.mode, "tiles");
    assert.equal(new Set(r.choices).size, r.choices.length);
    const right = r.answer.split(",").map(Number);
    assert.ok(right.length >= 2);
    for (let i = 0; i < r.choices.length; i++) {
      const t = parseTile(r.choices[i]);
      const means = lookup(t.lang, t.form).some((it) => it.forms.en === r.gloss);
      assert.equal(means, right.includes(i), `${r.gloss} ${r.choices[i]}`);
    }
  }
  assert.equal(new Set(rows.map((r) => r.gloss)).size, rows.length);
});

test("open tile rounds keep the answer and the right languages hidden", () => {
  const rows = buildPrompts(ITEMS, lobby(), LANGS);
  const v = visiblePrompts(rows, 0, false);
  assert.equal(v[0].answer, null);
  assert.equal(v[0].lang, null);
  assert.equal(visiblePrompts(rows, 1, false)[0].answer, rows[0].answer);
});

test("taps parse strictly", () => {
  assert.deepEqual(parseTapped("3,1,3", 6), [1, 3]);
  assert.deepEqual(parseTapped("-", 6), []);
  assert.equal(parseTapped("9", 6), null);
  assert.equal(parseTapped("1;2", 6), null);
  assert.equal(tappedChoice([3, 1, 3]), "1,3");
  assert.equal(tappedChoice([]), "-");
});

test("scoring rewards perfect rounds with a combo and wrong taps cancel hits", () => {
  assert.deepEqual(tileOutcome("1,3", [1, 3]), { hits: 2, wrong: 0, missed: 0, perfect: true });
  assert.deepEqual(tileOutcome("1,3", [1, 2]), { hits: 1, wrong: 1, missed: 1, perfect: false });
  assert.equal(tilePoints(tileOutcome("1,3", [1, 3]), 0), 100);
  assert.equal(tilePoints(tileOutcome("1,3", [1, 3]), 2), 200);
  assert.equal(tilePoints(tileOutcome("1,3", [1, 2]), 4), 0);
  assert.equal(comboMultiplier(9), 3);
});

test("lives drop on a miss or a skipped round and combos reset", () => {
  assert.deepEqual(tileHistory([], 0), { combo: 0, lives: TILE_LIVES });
  assert.deepEqual(tileHistory([{ round: 0, correct: true }, { round: 1, correct: true }], 2), { combo: 2, lives: 3 });
  assert.deepEqual(tileHistory([{ round: 0, correct: true }, { round: 2, correct: true }], 3), { combo: 1, lives: 2 });
  assert.deepEqual(tileHistory([{ round: 0, correct: false }, { round: 1, correct: false }, { round: 2, correct: false }], 3), { combo: 0, lives: 0 });
});

test("the tile answer path checks round, choice and lives", () => {
  const rows = buildPrompts(ITEMS, lobby(), LANGS);
  const p = rows[0];
  const ok = tileAnswerDecision(lobby(), p, 0, p.answer, T0 + 4000, []);
  assert.deepEqual(ok, { ok: true, correct: true, ms: 4000, points: p.answer.split(",").length * 50 });
  assert.deepEqual(tileAnswerDecision(lobby(), p, 0, "99", T0 + 4000, []), { ok: false, error: "bad_choice" });
  assert.deepEqual(tileAnswerDecision(lobby(), p, 1, p.answer, T0 + 4000, []), { ok: false, error: "wrong_round" });
  const dead = [0, 1, 2].map((round) => ({ round, correct: false }));
  assert.deepEqual(tileAnswerDecision(lobby(), rows[3], 3, rows[3].answer, T0 + 18_500, dead), { ok: false, error: "out_of_lives" });
});

test("tiles fall inside the round and finish before the submit cutoff", () => {
  for (const round of [0, 9]) {
    const s = tileSchedule(tileCount(round, 10), round, 10, 6);
    for (const t of s) assert.ok(t.spawnMs + t.fallMs <= 6000 * TILE_SUBMIT_AT);
    assert.ok(s.every((t) => t.lane >= 0 && t.lane < 4));
  }
  assert.ok(tileSchedule(12, 9, 10, 6)[0].fallMs < tileSchedule(6, 0, 10, 6)[0].fallMs);
});

test("bots tap from the visible tiles and submit late in the round", () => {
  const rows = buildPrompts(ITEMS, lobby(), LANGS);
  const v = visiblePrompts(rows, 0, false)[0];
  const right = new Set(rows[0].answer.split(",").map(Number));
  let hits = 0;
  let wrong = 0;
  for (let k = 0; k < 300; k++) {
    const taps = parseTapped(botTileChoice(v.choices, v.gloss, "en", lookup, "hard", `k${k}`), v.choices.length)!;
    hits += taps.filter((i) => right.has(i)).length;
    wrong += taps.filter((i) => !right.has(i)).length;
  }
  assert.ok(hits / (300 * right.size) > 0.85);
  assert.ok(wrong / 300 < 0.2);
  assert.ok(tileSubmitMs(6, 0) >= 3600 && tileSubmitMs(6, 6000) <= 6000 * TILE_SUBMIT_AT);
});

test("reveal names every tile with language, word, romanization and meaning", () => {
  const row = buildPrompts(ITEMS, lobby(), LANGS)[0];
  const item = ITEMS.find((i) => i.id === row.item_id);
  const r = revealEntries(row, "en", item, lookup);
  assert.equal(r.length, row.choices.length);
  assert.ok(r.every((e) => e.meaning && e.word && e.lang));
  assert.equal(r.filter((e) => e.correct).length, row.answer.split(",").length);
  const es = r.find((e) => e.lang === "es");
  if (es) assert.match(es.roman ?? "", /^r\d+$/);
  const form = revealEntries({ mode: "form", lang: "es", choices: ["es1", "es2"], answer: "es1" }, "en", ITEMS[1], lookup);
  assert.deepEqual(form.map((e) => [e.meaning, e.correct]), [["en1", true], ["en2", false]]);
  const flag = revealEntries({ mode: "flag", lang: "fr", choices: ["fr", "de"], answer: "fr" }, "en", ITEMS[4], lookup);
  assert.deepEqual(flag.map((e) => [e.lang, e.word, e.correct]), [["fr", "fr4", true], ["de", "de4", false]]);
});

test("seeded tile builds differ by seed", () => {
  const a = buildTilePrompts(ITEMS, { id: "L", root: "en", targets: ["es"], rounds: 4 }, LANGS, seededRandom("1"));
  const b = buildTilePrompts(ITEMS, { id: "L", root: "en", targets: ["es"], rounds: 4 }, LANGS, seededRandom("2"));
  assert.notDeepEqual(a, b);
});
