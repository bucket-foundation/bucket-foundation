import test from "node:test";
import assert from "node:assert/strict";
import { falseFriendPair, formMatch, FORM_THRESHOLD, damerauSimilarity, pairCoverage, soundKey, spellingKey, targetLexicon, understandableSet } from "../src/lib/polingual/understandable";
import { allPairs, loadCorpus, rootExamples, rootSeedReport } from "./polingual/root-seed";

const corpus = loadCorpus();
const words = (known: string[], target: string) => new Map(understandableSet(known, target, corpus).map((u) => [u.word, u]));
const item = (lang: string, word: string) => corpus.items.find((i) => i.kind === "word" && i.forms[lang] === word)!;

test("damerauSimilarity is one minus distance over the longer length, a swap costing one", () => {
  assert.equal(damerauSimilarity("mano", "mano"), 1);
  assert.equal(damerauSimilarity("noche", "notte"), 0.6);
  assert.equal(damerauSimilarity("perro", "cane"), 0);
  assert.equal(damerauSimilarity("", "cane"), 0);
  assert.equal(damerauSimilarity("abcd", "abdc"), 0.75);
});

test("keys fold accents, case, romanization and IPA marks", () => {
  assert.equal(spellingKey(item("es", "débil"), "es"), "debil");
  assert.equal(spellingKey(item("de", "Wasser"), "de"), "wasser");
  assert.equal(spellingKey(item("ru", "школа"), "ru"), "shkola");
  assert.ok(!/[ˈˌː.]/.test(soundKey(item("it", "notte"), "it")));
  assert.equal(soundKey(item("ja", "女"), "ja"), "");
});

test("Spanish known, Italian target", () => {
  const set = words(["es"], "it");
  assert.deepEqual(set.get("mano")?.via, { lang: "es", word: "mano" });
  assert.equal(set.get("mano")?.similarity, 1);
  for (const w of ["notte", "latte", "rosso", "scuola", "vivere"]) assert.ok(set.has(w), w);
  for (const w of ["donna", "cane", "piccolo", "giallo"]) assert.ok(!set.has(w), w);
  assert.equal(set.get("latte")?.channel, "sound");
  assert.equal(targetLexicon(corpus, "it").length, 244);
});

test("Spanish known, French target", () => {
  const set = words(["es"], "fr");
  for (const w of ["terre", "fleur", "livre", "quatre", "chanter"]) assert.ok(set.has(w), w);
  for (const w of ["chien", "femme", "main", "eau"]) assert.ok(!set.has(w), w);
  assert.ok(set.size < words(["es"], "it").size);
});

test("each added known language keeps or grows the set", () => {
  const one = words(["es"], "fr");
  const two = words(["es", "en"], "fr");
  one.forEach((_, w) => assert.ok(two.has(w), w));
  assert.ok(two.size > one.size);
  assert.equal(two.get("orange")?.via.lang, "en");
});

test("cross-script pairs match through romanization", () => {
  const set = words(["ru"], "pl");
  assert.deepEqual(set.get("szkoła")?.via, { lang: "ru", word: "школа" });
  assert.ok(set.has("mleko"));
});

test("unrelated languages share few words", () => {
  assert.ok(pairCoverage(["en"], "ja", corpus).understood < 10);
  assert.ok(pairCoverage(["es"], "pt", corpus).share > 0.6);
});

test("every entry clears the threshold and names a real known form", () => {
  for (const [known, target] of [["es", "it"], ["en", "de"], ["ru", "pl"], ["la", "es"]]) {
    for (const u of understandableSet([known], target, corpus)) {
      assert.ok(u.similarity >= FORM_THRESHOLD, `${known}>${target} ${u.word}`);
      const it = corpus.items.find((i) => i.id === u.itemId)!;
      assert.equal(it.forms[target], u.word);
      assert.equal(it.forms[u.via.lang], u.via.word);
    }
  }
});

test("empty and self-only known lists give an empty set", () => {
  assert.deepEqual(understandableSet([], "it", corpus), []);
  assert.deepEqual(understandableSet(["it"], "it", corpus), []);
  assert.deepEqual(understandableSet(["xx"], "it", corpus), []);
});

test("the function is pure", () => {
  const before = JSON.stringify(corpus);
  const a = understandableSet(["es", "en"], "it", corpus);
  const b = understandableSet(["es", "en"], "it", corpus);
  assert.deepEqual(a, b);
  assert.equal(JSON.stringify(corpus), before);
});

test("a stricter threshold shrinks the set", () => {
  assert.ok(understandableSet(["es"], "it", corpus, 0.8).length < understandableSet(["es"], "it", corpus).length);
});

test("the report covers every ordered pair and its examples pass the rule", () => {
  const pairs = allPairs(corpus, ["es", "it", "fr", "en"]);
  assert.equal(pairs.length, 12);
  assert.ok(pairs[0].share >= pairs[pairs.length - 1].share);
  const report = rootSeedReport(corpus);
  assert.ok(report.pairs.every((p) => p.understood <= p.total && p.total > 0));
  const examples = rootExamples(corpus);
  assert.ok(examples.length > 0);
  for (const e of examples) {
    assert.ok(e.root.startsWith("*"));
    assert.ok(Object.keys(e.forms).length >= 3);
  }
});

test("a listed false friend pair never explains a word", () => {
  const long = item("es", "largo");
  assert.equal(long.falseFriends.es?.looksLike, "large");
  assert.ok(formMatch(long, "en", "es").similarity >= 0.4);
  assert.ok(falseFriendPair(long, "en", "es") && falseFriendPair(long, "es", "en"));
  assert.ok(!falseFriendPair(long, "it", "es"));
  assert.ok(!understandableSet(["en"], "es", corpus, 0.4).some((u) => u.itemId === long.id));
  assert.ok(!understandableSet(["es"], "en", corpus, 0.4).some((u) => u.itemId === long.id));
  assert.equal(understandableSet(["en", "it"], "es", corpus).find((u) => u.itemId === long.id)?.via.lang, "it");
});

test("the relation is symmetric", () => {
  const ids = (k: string, t: string, th?: number) => understandableSet([k], t, corpus, th).map((u) => u.itemId).sort();
  for (const [a, b] of [["es", "it"], ["es", "fr"], ["en", "de"], ["ru", "pl"], ["en", "ja"], ["it", "pt"]]) {
    assert.deepEqual(ids(a, b), ids(b, a), `${a} ${b}`);
    assert.equal(pairCoverage([a], b, corpus).understood, pairCoverage([b], a, corpus).understood);
  }
  assert.deepEqual(ids("en", "es", 0.4), ids("es", "en", 0.4));
  const hand = item("es", "mano");
  assert.deepEqual(formMatch(hand, "es", "fr"), formMatch(hand, "fr", "es"));
});
