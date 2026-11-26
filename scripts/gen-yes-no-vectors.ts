import fs from "node:fs";
import path from "node:path";
import { assembleTest, buildLexicon, mulberry32, pseudoword, scoreTest, syllabify, testDue, yesNoKnown } from "../src/lib/academy/yes-no-test";

const top = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "apple/Shared/Corpus/top1000/es.json"), "utf8")) as { word: string; rank: number }[];
const words = top.map((t) => t.word);
const candidates = top.map((t, i) => ({ word: t.word, rank: (i + 1) * 8 }));
const lex = buildLexicon(words);
const r = mulberry32(42);
const rand = Array.from({ length: 6 }, () => r());
const syllables = ["casa", "estrella", "trabajo", "construir", "aéreo", "perro", "x", "año", "123"].map((w) => ({ word: w, syllables: syllabify(w) }));
const pr = mulberry32(7);
const pseudo = ["casa", "tiempo", "hombre", "palabra", "siempre", "nada"].map((w) => ({ word: w, out: pseudoword(w, lex, pr) }));
const reject = ["basas", "hadas", "timpie", "honje"];
const lexR = buildLexicon(words, reject);
const pr2 = mulberry32(7);
const pseudoReject = ["casa", "tiempo", "hombre", "nada"].map((w) => ({ word: w, out: pseudoword(w, lexR, pr2) }));
const formA = assembleTest(candidates, new Set(), 1001, lex);
const formB = assembleTest(candidates, new Set(), 1002, lex, new Set((formA ?? []).map((i) => i.word)));
const yes = new Set((formA ?? []).filter((_, i) => i % 3 !== 0).map((i) => i.word));
const score = formA ? scoreTest(formA, yes) : null;
const known = [[40, 50, 0, 20], [40, 50, 10, 20], [10, 50, 20, 20], [0, 0, 0, 0]].map(([h, w, f, p]) => ({ args: [h, w, f, p], known: yesNoKnown(h, w, f, p) }));
const day = 86_400_000;
const due = [
  { enrolledAt: null, now: 0, taken: { baseline: false, day28: false } },
  { enrolledAt: 0, now: 5, taken: { baseline: false, day28: false } },
  { enrolledAt: 0, now: 27 * day, taken: { baseline: true, day28: false } },
  { enrolledAt: 0, now: 28 * day, taken: { baseline: true, day28: false } },
  { enrolledAt: 0, now: 35 * day + 5, taken: { baseline: true, day28: false } },
  { enrolledAt: 0, now: 36 * day, taken: { baseline: true, day28: false } },
  { enrolledAt: 0, now: 30 * day, taken: { baseline: true, day28: true } },
].map((c) => ({ ...c, due: testDue(c.enrolledAt, c.now, c.taken) }));
fs.writeFileSync(
  path.join(__dirname, "..", "src/lib/academy/yes-no-vectors.json"),
  JSON.stringify({ version: 1, words, candidates, rand, syllables, pseudo, reject, pseudoReject, formA, formB, yes: Array.from(yes).sort(), score, known, due }, null, 1) + "\n",
);
