import { test } from "node:test";
import assert from "node:assert/strict";
import { dailyGroups, emptyGroups, groupId, submitGroup, toggleTile } from "./groups";
import { dailyLetters, LETTER_ROUND } from "./letters";
import { Speed, SPEED_HOT_COMBO } from "./speed";
import { bookKey, DAILY_BRANCH, loadBook, mergeBooks, recordResult, shareText, type DailyBook, type DailyResult } from "./store";
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

const res = (game: DailyResult["game"], day: string, savedAt: number, pattern = "1"): DailyResult => ({ game, day, score: [...pattern].filter((c) => c === "1").length, total: pattern.length, pattern, savedAt, words: [] });

test("the first result per game and day wins every merge", () => {
  const first = res("mini", "2026-11-12", 100, "10");
  const later = res("mini", "2026-11-12", 200, "11");
  const k = bookKey("mini", "2026-11-12");
  assert.equal(mergeBooks({ [k]: later }, { [k]: first })[k], first);
  assert.equal(mergeBooks({ [k]: first }, { [k]: later })[k], first);
  const other = res("daily-set", "2026-11-12", 150);
  assert.deepEqual(Object.keys(mergeBooks({ [k]: later }, { [bookKey("daily-set", "2026-11-12")]: other })).sort(), ["daily-set|2026-11-12", "mini|2026-11-12"]);
});

function fakeAccount(initial: DailyBook, opts: { failPosts?: number; token?: string | null } = {}) {
  let remote: DailyBook = initial;
  let fails = opts.failPosts ?? 0;
  const posts: DailyBook[] = [];
  const deps = {
    token: async () => (opts.token === undefined ? "t" : opts.token),
    fetch: (async (_u: string, init?: RequestInit) => {
      if (init?.method === "POST") {
        if (fails-- > 0) return new Response("{}", { status: 500 });
        remote = (JSON.parse(String(init.body)) as { data: { results: DailyBook } }).data.results;
        posts.push(remote);
        return new Response(JSON.stringify({ ok: true }));
      }
      return new Response(JSON.stringify({ branches: { [DAILY_BRANCH]: { data: { results: remote } } } }));
    }) as unknown as typeof fetch,
  };
  return { deps, posts, remote: () => remote };
}

function memory(): Storage {
  const mem = new Map<string, string>();
  return { getItem: (k: string) => mem.get(k) ?? null, setItem: (k: string, v: string) => void mem.set(k, v) } as unknown as Storage;
}

test("a second device keeps the account's first result and saves nothing new", async () => {
  const k = bookKey("mini", "2026-11-12");
  const acct = fakeAccount({ [k]: res("mini", "2026-11-12", 100, "10") });
  const out = await recordResult(res("mini", "2026-11-12", 500, "11"), memory(), acct.deps);
  assert.equal(out.saved, "account");
  assert.equal(out.book[k].pattern, "10");
  assert.equal(acct.posts.length, 0);
});

test("saving merges per key, retries a failed write and reports the state", async () => {
  const acct = fakeAccount({ [bookKey("daily-set", "2026-11-11")]: res("daily-set", "2026-11-11", 50) }, { failPosts: 1 });
  const out = await recordResult(res("mini", "2026-11-12", 100), memory(), acct.deps);
  assert.equal(out.saved, "account");
  assert.deepEqual(Object.keys(acct.remote()).sort(), ["daily-set|2026-11-11", "mini|2026-11-12"]);
  assert.equal((await recordResult(res("mini", "2026-11-13", 1), memory(), fakeAccount({}, { token: null }).deps)).saved, "device");
  assert.equal((await recordResult(res("mini", "2026-11-13", 1), memory(), fakeAccount({}, { failPosts: 9 }).deps)).saved, "failed");
  const loaded = await loadBook(memory(), acct.deps);
  assert.ok(loaded[bookKey("mini", "2026-11-12")]);
});

test("share text is a grid", () => {
  assert.match(shareText("Mini", res("mini", "2026-11-12", 1, "11101"), "https://polingual.com/play/mini"), /4 of 5\n🟩🟩🟩🟥🟩/);
});

test("the deck exists for every guest language pair", () => {
  assert.ok(new GameDeck(corpus, "en", ["es", "fr", "de"]).pool("de").length > 100);
});

test("letters are counted after NFC normalization", async () => {
  const { miniLetters } = await import("./mini");
  const decomposed = "número";
  assert.equal(decomposed.length, 7);
  assert.deepEqual(miniLetters(decomposed), ["N", "Ú", "M", "E", "R", "O"]);
});
