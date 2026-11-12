import assert from "node:assert/strict";
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";
import { buildLangCorpus } from "@academy/lang-systems";
import { fnvHash, GameDeck, lobbyPrompts, lobbyRounds, mixed, SeededRandom, seedValue, type GamePrompt } from "./rounds";

const FIXTURES = join(__dirname, "../../../../apple/BucketKit/Tests/BucketKitTests/Fixtures");
const VECTORS = join(FIXTURES, "lobby-rounds.json");

function fixture(name: string) {
  return JSON.parse(readFileSync(join(FIXTURES, "lang", `${name}.json`), "utf8"));
}

const corpus = buildLangCorpus(fixture("core"), fixture("cognates"), fixture("phrases"), fixture("layers"));

const CASES = [
  { game: "daily", root: "en", targets: ["es"], seed: "12345678901234567", rounds: 8 },
  { game: "daily", root: "en", targets: ["fr", "es", "it"], seed: "42", rounds: 10 },
  { game: "daily", root: "es", targets: ["de", "ja"], seed: "18446744073709551615", rounds: 6 },
  { game: "daily", root: "en", targets: ["zh", "ar"], seed: "not-a-number", rounds: 5 },
  { game: "same-word", root: "en", targets: ["es", "it", "fr"], seed: "777", rounds: 12 },
  { game: "same-word", root: "en", targets: ["de", "sv"], seed: "9001", rounds: 8 },
  { game: "flags", root: "en", targets: ["es", "pt", "ru"], seed: "31337", rounds: 8 },
  { game: "flags", root: "en", targets: ["ja"], seed: "5", rounds: 6 },
];

function row(p: GamePrompt): string {
  return [p.id, p.mode, p.group, p.word.lang, p.word.itemId, p.word.form, p.answer, p.choices.join("|")].join("\t");
}

function compute() {
  return {
    rng: Array.from({ length: 4 }, ((r) => () => r.next().toString())(new SeededRandom(BigInt(7)))),
    zero: new SeededRandom(BigInt(0)).next().toString(),
    hash: ["", "lobby", "día|en|es,fr"].map((s) => fnvHash(s).toString()),
    mixed: mixed([0, 1, 2, 3, 4, 5, 6, 7, 8, 9], new SeededRandom(BigInt(99))).join(","),
    cases: CASES.map((c) => ({ ...c, prompts: lobbyPrompts(corpus, c).map(row) })),
  };
}

test("lobby prompts match the shared vectors", () => {
  const got = compute();
  if (process.env.UPDATE_VECTORS === "1") writeFileSync(VECTORS, JSON.stringify(got, null, 2) + "\n");
  assert.deepEqual(got, JSON.parse(readFileSync(VECTORS, "utf8")));
});

test("every case yields prompts with the answer among four distinct choices", () => {
  for (const c of compute().cases) {
    assert.ok(c.prompts.length > 0, `${c.game} ${c.targets}`);
    for (const line of c.prompts) {
      const cols = line.split("\t");
      const choices = cols[7].split("|");
      assert.ok(choices.includes(cols[6]));
      assert.equal(new Set(choices).size, choices.length);
    }
  }
});

test("same seed gives the same daily rounds, a new seed changes them", () => {
  const deck = new GameDeck(corpus, "en", ["es", "fr"]);
  assert.deepEqual(lobbyRounds(deck, BigInt(1), 6), lobbyRounds(deck, BigInt(1), 6));
  assert.notDeepEqual(lobbyRounds(deck, BigInt(1), 6).map(row), lobbyRounds(deck, BigInt(2), 6).map(row));
});

test("seed strings parse as UInt64 or fall back to the FNV hash", () => {
  assert.equal(seedValue("42"), BigInt(42));
  assert.equal(seedValue("18446744073709551616"), fnvHash("18446744073709551616"));
  assert.equal(seedValue("abc"), fnvHash("abc"));
});
