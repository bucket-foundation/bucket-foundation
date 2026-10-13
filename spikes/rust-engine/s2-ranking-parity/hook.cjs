const fs = require("fs");
const path = require("path");
const { loadRank, scoreBits } = require("../s3-wasm-in-bun/rank-wasm.cjs");

const DIR = process.env.CANON_RANK_RECORD_DIR || "";
const WASM = process.env.CANON_RANK_WASM || "";
const seen = new WeakMap();
let indexes = 0;
let calls = 0;

const b64 = (v) => Buffer.from(v.buffer, v.byteOffset, v.byteLength).toString("base64");

function stateFor(index) {
  let s = seen.get(index);
  if (s) return s;
  const name = `fixture-index-${indexes++}.json`;
  if (DIR) fs.writeFileSync(path.join(DIR, name), JSON.stringify({ texts: index.map((e) => e.text.toWellFormed()), vecs: index.map((e) => b64(e.vec)) }));
  let rank = null;
  if (WASM) {
    rank = loadRank(fs.readFileSync(WASM));
    for (const e of index) rank.push(e.text, e.vec);
  }
  s = { name, rank };
  seen.set(index, s);
  return s;
}

function hooked(fn, index, arg, topK, ts) {
  if (!DIR && !WASM) return ts();
  const s = stateFor(index);
  if (s.rank) {
    calls++;
    if (process.env.CANON_RANK_WASM_LOG) fs.writeFileSync(process.env.CANON_RANK_WASM_LOG, `${calls}\n`);
    const hits = fn === "token" ? s.rank.tokenRank(arg, topK) : s.rank.cosineRank(arg, topK);
    return hits.map(([i, score]) => ({ entry: index[i], score }));
  }
  const out = ts();
  const expect = out.map((h) => [index.indexOf(h.entry), scoreBits(h.score)]);
  const line =
    fn === "token"
      ? { kind: "token", class: "fixture", index: s.name, query: arg.toWellFormed(), top_k: topK, expect }
      : { kind: "cosine", class: "fixture", index: s.name, q: b64(arg), top_k: topK, expect };
  fs.appendFileSync(path.join(DIR, "fixture-calls.jsonl"), JSON.stringify(line) + "\n");
  return out;
}

module.exports = { hooked };
