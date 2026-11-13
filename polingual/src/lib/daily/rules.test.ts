import { test } from "node:test";
import assert from "node:assert/strict";
import { dailyGroups, emptyGroups, groupId, submitGroup, toggleTile } from "./groups";
import { dailyLetters, LETTER_ROUND } from "./letters";
import { Speed, SPEED_HOT_COMBO } from "./speed";
import { bookKey, mergeBooks, recordResult, shareText, type DailyResult } from "./store";
import { balanced, flags, GameDeck, starter, wordId } from "./words";
import { SeededRandom } from "./rng";
import { nativeCorpus } from "./fixture";

const corpus = nativeCorpus();
const words = starter("en", ["es", "fr"], corpus, 60);

test("word groups solve, one away and repeat", () => {
  const p = dailyGroups(words, "2026-11-12", "en", ["es", "fr"], (w) => corpus.byId.get(w.itemId)?.category ?? null)!;
  const [a, b] = p.groups;
  let s = emptyGroups();
  for (const w of [...a.words.slice(0, 3), b.words[0]]) s = toggleTile(p, s, wordId(w));
  let out;
  [s, out] = submitGroup(p, s);
  assert.equal(out, "oneAway");
  assert.equal(submitGroup(p, s)[1], "repeated");
  s = { ...s, selected: a.words.map(wordId) };
  [s, out] = submitGroup(p, s);
  assert.equal(out, "solved");
  assert.deepEqual(s.solved, [groupId(a)]);
  assert.equal(s.pattern, "01");
});

test("speed match scores, doubles on a hot combo and records misses", () => {
  const deck = balanced(starter("en", ["es", "fr"], corpus, 30));
  const g = new Speed(deck, 7n);
  assert.ok(g.playable);
  const first = g.board.meanings.find(Boolean)!;
  const other = g.board.forms.find((f) => f && wordId(f) !== wordId(first))!;
  g.tapMeaning(wordId(first));
  assert.equal(g.tapForm(wordId(other)).kind, "missed");
  for (let n = 0; n < SPEED_HOT_COMBO + 1; n++) {
    const m = g.board.meanings.find(Boolean)!;
    g.tapMeaning(wordId(m));
    assert.equal(g.tapForm(wordId(m)).kind, "matched");
  }
  assert.equal(g.board.hits, SPEED_HOT_COMBO + 1);
  assert.equal(g.board.points, SPEED_HOT_COMBO - 1 + 4);
  assert.equal(g.board.missed.length, 1);
});

test("which voice asks for the language with family distractors", () => {
  const p = flags(words, ["es", "fr"], "voice", new SeededRandom(5n));
  assert.equal(p.length, 10);
  for (const q of p) {
    assert.equal(q.answer, q.word.lang);
    assert.equal(new Set(q.choices).size, 4);
  }
});

test("letter sprint deals eight letters from one alphabet, stable for the day", () => {
  const a = dailyLetters("2026-11-12", ["es", "fr"]);
  assert.equal(a.length, LETTER_ROUND);
  assert.deepEqual(a, dailyLetters("2026-11-12", ["fr", "es"]));
  assert.equal(new Set(a.map((x) => x.lang)).size, 1);
  for (const q of a) assert.ok(q.choices.includes(q.ch) && q.choices.length === 4);
  assert.equal(dailyLetters("2026-11-12", ["ru", "es"])[0].lang, "ru");
});

test("results merge local and account books and share as a grid", async () => {
  const r: DailyResult = { game: "mini", day: "2026-11-12", score: 4, total: 5, pattern: "11101", words: [] };
  assert.deepEqual(Object.keys(mergeBooks({ [bookKey("mini", r.day)]: r }, {})), ["mini|2026-11-12"]);
  const mem = new Map<string, string>();
  const storage = { getItem: (k: string) => mem.get(k) ?? null, setItem: (k: string, v: string) => void mem.set(k, v) } as unknown as Storage;
  const posts: string[] = [];
  const deps = {
    token: async () => "t",
    fetch: (async (_u: string, init?: RequestInit) => {
      if (init?.method === "POST") posts.push(String(init.body));
      return new Response(JSON.stringify({ branches: { "polingual-daily": { data: { results: { "daily-set|2026-11-11": { ...r, game: "daily-set", day: "2026-11-11" } } } } } }));
    }) as unknown as typeof fetch,
  };
  const book = await recordResult(r, storage, deps);
  assert.deepEqual(Object.keys(book).sort(), ["daily-set|2026-11-11", "mini|2026-11-12"]);
  assert.equal(posts.length, 1);
  assert.match(shareText("Mini", r, "https://polingual.com/play/mini"), /4 of 5\n🟩🟩🟩🟥🟩/);
});

test("the deck exists for every guest language pair", () => {
  assert.ok(new GameDeck(corpus, "en", ["es", "fr", "de"]).pool("de").length > 100);
});
