import { mkdirSync, openSync, writeSync, closeSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { cosineRank, tokenRank, type ClaimIndexEntry } from "../../../src/lib/canon-rank";

const out = resolve(process.argv[2] ?? `${import.meta.dir}/../.data/s2/cases.jsonl`);
const N = Number(process.argv[3] ?? 10000);
mkdirSync(dirname(out), { recursive: true });
const fd = openSync(out, "w");
const emit = (o: unknown) => writeSync(fd, JSON.stringify(o) + "\n");

let state = 0x9e3779b9;
const rand = () => {
  state = (state + 0x6d2b79f5) | 0;
  let t = Math.imul(state ^ (state >>> 15), 1 | state);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};
const int = (lo: number, hi: number) => lo + Math.floor(rand() * (hi - lo + 1));
const pick = <T>(xs: readonly T[]) => xs[Math.floor(rand() * xs.length)];

const NO_VEC = new Float32Array(0);
const entry = (rowid: number, text: string, vec: Float32Array = NO_VEC): ClaimIndexEntry => ({ rowid, branch: "", concept: "", slug: "", title: "", path: "", text, vec });
const bits = (x: number) => {
  const b = new DataView(new ArrayBuffer(8));
  b.setFloat64(0, x);
  return b.getBigUint64(0).toString(16).padStart(16, "0");
};
const b64 = (v: Float32Array) => Buffer.from(v.buffer, v.byteOffset, v.byteLength).toString("base64");
const expectOf = (hits: { entry: ClaimIndexEntry; score: number }[]) => hits.map((h) => [h.entry.rowid, bits(h.score)]);

const WORDS = ["light", "water", "energy", "entropy", "dna", "x1", "abc", "the", "field", "time", "e2e", "h2o", "kelvin", "istanbul", "odos", "strasse", "elegans", "worm"];
const casing = (w: string) => {
  const r = rand();
  if (r < 0.6) return w;
  if (r < 0.8) return w.toUpperCase();
  return w[0].toUpperCase() + w.slice(1);
};
const ASCII_SEPS = [" ", " ", " ", ", ", ". ", "-", "_", "\n", "\t", "(", ")", "", "/", "'"];
const FRAGMENTS = [
  "é", "É", "ñ", "ü", "ß", "ẞ", "İ", "ı", "K", "Å", "Σ", "σ", "ς", "ά", "Ω",
  "д", "Д", "光", "水", "エネルギー", "한", "́", "̈", "‍", "\u{1f4a1}", "\u{1d49c}", "Ａ",
  "ｌｉｇｈｔ", "٣", "ﬁ", "ǅ", "ǆ", "Ꭰ", "Ა", "\u{1e900}", " ", " ", "’", "·", "٠",
  "Kelvin", "İstanbul", "İstanbul", "ΟΔΟΣ", "Straße", "STRAẞE",
];
const NON_ASCII_SEPS = ["", "", "", " ", " ", ", ", "-", "_", "\n", " ", "　"];

function asciiText(): string {
  const n = int(0, 30);
  let s = "";
  for (let i = 0; i < n; i++) s += casing(pick(WORDS)) + (rand() < 0.1 ? String(int(0, 99)) : "") + pick(ASCII_SEPS);
  return s;
}

function mixedText(): string {
  const n = int(1, 30);
  let s = "";
  for (let i = 0; i < n; i++) s += (rand() < 0.55 ? casing(pick(WORDS)) : pick(FRAGMENTS)) + pick(NON_ASCII_SEPS);
  return s;
}

function query(mixed: boolean): string {
  const n = int(0, 4);
  const parts: string[] = [];
  for (let i = 0; i < n; i++) {
    let w = casing(pick(WORDS));
    if (mixed && rand() < 0.4) w = rand() < 0.5 ? pick(FRAGMENTS) + w : w + pick(FRAGMENTS);
    if (rand() < 0.1) w = Array.from(w).slice(0, int(1, 3)).join("");
    parts.push(w);
  }
  return parts.join(pick([" ", " ", ",", "  ", "-", " "]));
}

function tokenCase(cls: string, mixed: boolean, surrogate = false) {
  const texts = Array.from({ length: int(1, 24) }, () => (mixed ? mixedText() : asciiText()));
  if (surrogate) for (let i = 0; i < texts.length; i += 2) texts[i] = `${texts[i]}\ud83d${pick(WORDS)}\udc00 ${pick(WORDS)}\ud800`;
  const q = query(mixed) + (surrogate ? `\ud800${pick(WORDS)}` : "");
  const topK = pick([0, 1, 3, 10, 30, 150]);
  const expect = expectOf(tokenRank(texts.map((t, i) => entry(i, t)), q, topK));
  emit({ kind: "token", class: cls, texts: surrogate ? texts.map((t) => t.toWellFormed()) : texts, query: surrogate ? q.toWellFormed() : q, top_k: topK, expect });
}

const DIMS = [1, 2, 3, 4, 8, 16, 16, 32, 32, 64, 64, 384];
function vector(dim: number, style: number): Float32Array {
  const v = new Float32Array(dim);
  for (let i = 0; i < dim; i++) {
    if (style === 0) v[i] = rand() * 2 - 1;
    else if (style === 1) v[i] = int(-3, 3);
    else if (style === 2) v[i] = (rand() * 2 - 1) * 1000;
    else v[i] = (rand() * 2 - 1) * 10 ** int(-6, 0);
  }
  if (style === 0 && rand() < 0.5) {
    let norm = 0;
    for (let i = 0; i < dim; i++) norm += v[i] * v[i];
    norm = Math.sqrt(norm) || 1;
    for (let i = 0; i < dim; i++) v[i] = v[i] / norm;
  }
  return v;
}

function cosineCase(cls: string, style: number, mutate?: (vecs: Float32Array[], q: Float32Array) => Float32Array) {
  const dim = pick(DIMS);
  const n = int(1, 32);
  const vecs = Array.from({ length: n }, () => vector(dim, style));
  if (rand() < 0.3 && n > 1) vecs[int(1, n - 1)] = vecs[0].slice();
  let q = vector(dim, style);
  if (mutate) q = mutate(vecs, q);
  const topK = pick([0, 1, 3, 10, 30, 150]);
  const expect = expectOf(cosineRank(vecs.map((v, i) => entry(i, "", v)), q, topK));
  emit({ kind: "cosine", class: cls, vecs: vecs.map(b64), q: b64(q), top_k: topK, expect });
}

for (let i = 0; i < N / 2; i++) tokenCase("ascii", false);
for (let i = 0; i < N / 2; i++) tokenCase("non-ascii", true);
for (let i = 0; i < 100; i++) tokenCase("lone-surrogate", true, true);
for (let i = 0; i < N * 0.6; i++) cosineCase("nan-free real", pick([0, 0, 2, 3]));
for (let i = 0; i < N * 0.4; i++) cosineCase("nan-free small-integer ties", 1);
for (let i = 0; i < 200; i++)
  cosineCase("query length differs", 0, (_v, q) => (rand() < 0.5 ? q.slice(0, Math.max(0, q.length - int(1, 3))) : Float32Array.from([...q, ...vector(int(1, 3), 0)])));
const BAD = [NaN, Infinity, -Infinity, 3.4e38, -3.4e38];
for (let i = 0; i < 500; i++)
  cosineCase("non-finite input", 0, (vecs, q) => {
    for (const v of vecs) if (rand() < 0.3) v[int(0, v.length - 1)] = pick(BAD);
    if (rand() < 0.3) q[int(0, q.length - 1)] = pick(BAD);
    return q;
  });

const table: Record<string, string> = {};
for (let cp = 0; cp <= 0x10ffff; cp++) {
  if (cp >= 0xd800 && cp <= 0xdfff) continue;
  const s = String.fromCodePoint(cp);
  const l = s.toLowerCase();
  if (l !== s) table[cp.toString(16)] = l;
}
emit({ kind: "lowertable", class: "every code point", table, unicode: process.versions.unicode ?? null, icu: process.versions.icu ?? null });

const CONTEXT = ["Σ", "σ", "ς", "Α", "α", "a", "A", " ", ".", "'", "’", "́", "­", "1", "-", "İ", "I", "̇", "ß", "ǅ", "Ⅷ", "ẞ", "\u{1e900}", "Ꭰ", ":", "·", "‍"];
for (let i = 0; i < 5000; i++) {
  const s = Array.from({ length: int(1, 8) }, () => pick(CONTEXT)).join("");
  emit({ kind: "lower", class: "context strings", s, lowered: s.toLowerCase() });
}
closeSync(fd);
console.log(JSON.stringify({ out, token: N + 100, cosine: N + 700, lowercase_table_entries: Object.keys(table).length, bun: Bun.version, unicode: process.versions.unicode ?? null }));
