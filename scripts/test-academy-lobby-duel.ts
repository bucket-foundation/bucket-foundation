import test from "node:test";
import assert from "node:assert/strict";
import { coinsOf, duelPrompts, fiftyHide, normalizeLobbyConfig, powerDecision, visiblePrompts } from "../src/lib/academy/lobbies";
import { knownChoice } from "../src/lib/academy/lobby-bots";
import { revealEntries } from "../src/lib/academy/lobby-reveal";

const T0 = Date.parse("2026-11-13T12:00:00Z");

function word(n: number): any {
  return { id: `w${n}`, kind: "word", category: n % 2 ? "food" : "home", gloss: `en${n}`, forms: { en: `en${n}`, es: `es${n}`, fr: `fr${n}`, de: `de${n}`, it: `it${n}` } };
}
const items = Array.from({ length: 60 }, (_, i) => word(i));
const lobby = { id: "00000000-0000-4000-8000-000000000001", seed: "42", root: "en", targets: ["es", "fr", "de"], rounds: 10 };

test("duel alternates which-language and meaning rounds with distinct words", () => {
  const rows = duelPrompts(items, lobby, ["es", "fr", "de", "it"]);
  assert.equal(rows.length, 10);
  rows.forEach((r, i) => {
    assert.equal(r.round, i);
    assert.equal(r.mode, i % 2 ? "meaning" : "flag");
    assert.ok(r.choices.includes(r.answer));
    assert.equal(new Set(r.choices).size, r.choices.length);
  });
  assert.equal(new Set(rows.map((r) => r.item_id)).size, 10);
  const meaning = rows[1];
  const item = items.find((i) => i.id === meaning.item_id);
  assert.equal(meaning.gloss, item.forms[meaning.lang]);
  assert.equal(meaning.answer, item.forms.en);
  assert.deepEqual(duelPrompts(items, lobby, ["es", "fr", "de", "it"]), rows);
});

test("meaning rounds show their language while open and bots can read them", () => {
  const rows = duelPrompts(items, lobby, ["es", "fr", "de"]);
  const shown = visiblePrompts(rows, 1, false).find((p) => p.round === 1);
  assert.equal(shown?.lang, rows[1].lang);
  assert.equal(shown?.answer, null);
  const lookup = (lang: string, form: string) => items.filter((i) => i.forms[lang] === form);
  assert.equal(knownChoice({ mode: "meaning", lang: rows[1].lang, gloss: rows[1].gloss, choices: rows[1].choices }, "en", lookup), rows[1].answer);
  const entries = revealEntries(rows[1], "en", items.find((i) => i.id === rows[1].item_id), lookup);
  assert.equal(entries[0].correct, true);
  assert.equal(entries[0].word, rows[1].gloss);
  assert.equal(entries.filter((e) => e.correct).length, 1);
});

test("coins come from right answers and pay for power-ups", () => {
  const answers = [{ user_id: "a", correct: true }, { user_id: "a", correct: true }, { user_id: "a", correct: false }, { user_id: "b", correct: true }];
  assert.equal(coinsOf(answers, [], "a"), 2);
  assert.equal(coinsOf(answers, [{ user_id: "a", kind: "double" }], "a"), 0);
  assert.equal(coinsOf(answers, [{ user_id: "a", kind: "fifty" }], "a"), 1);
});

test("power-ups are bought between rounds for the next round only", () => {
  const l = { status: "playing" as const, game: "duel" as const, started_at: new Date(T0).toISOString(), rounds: 10, round_seconds: 8, reveal_seconds: 4 };
  assert.deepEqual(powerDecision(l, "double", 2, T0 + 9000), { ok: true, round: 1 });
  assert.deepEqual(powerDecision(l, "double", 1, T0 + 9000), { ok: false, error: "no_coins" });
  assert.deepEqual(powerDecision(l, "fifty", 1, T0 + 2000), { ok: false, error: "wrong_round" });
  assert.deepEqual(powerDecision(l, "freeze", 5, T0 + 9000), { ok: false, error: "bad_request" });
  assert.deepEqual(powerDecision({ ...l, game: "flags" }, "fifty", 5, T0 + 9000), { ok: false, error: "not_playing" });
  assert.deepEqual(powerDecision(l, "fifty", 5, T0 + 9 * 12000 + 9000), { ok: false, error: "wrong_round" });
});

test("50/50 hides two wrong choices and keeps the answer", () => {
  const hide = fiftyHide(["a", "b", "c", "d"], "c", "seed:1:u");
  assert.equal(hide.length, 2);
  assert.ok(!hide.includes("c"));
  assert.deepEqual(fiftyHide(["a", "b", "c", "d"], "c", "seed:1:u"), hide);
});

test("duel lobbies need the duel flag", () => {
  const env = process.env.POLINGUAL_LOBBY_DUEL;
  try {
    process.env.POLINGUAL_LOBBY_DUEL = "";
    assert.equal(normalizeLobbyConfig({ root: "en", targets: ["es"], game: "duel" }), null);
    process.env.POLINGUAL_LOBBY_DUEL = "on";
    assert.equal(normalizeLobbyConfig({ root: "en", targets: ["es"], game: "duel", rounds: 10 })?.game, "duel");
  } finally {
    process.env.POLINGUAL_LOBBY_DUEL = env;
  }
});
