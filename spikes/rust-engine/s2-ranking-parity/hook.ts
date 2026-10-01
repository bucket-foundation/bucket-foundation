import fs from "fs";
import path from "path";
import { loadRank, scoreBits, type Rank } from "../s3-wasm-in-bun/rank-wasm";

type Entry = { rowid: number; text: string; vec: Float32Array };
type Result = { entry: Entry; score: number }[];

const DIR = process.env.CANON_RANK_RECORD_DIR || "";
const WASM = process.env.CANON_RANK_WASM || "";
const seen = new WeakMap<object, { name: string; rank: Rank | null }>();
let indexes = 0;
let calls = 0;

const b64 = (v: Float32Array) => Buffer.from(v.buffer, v.byteOffset, v.byteLength).toString("base64");

function stateFor(index: Entry[]) {
  let s = seen.get(index);
  if (s) return s;
  const name = `fixture-index-${indexes++}.json`;
  if (DIR) fs.writeFileSync(path.join(DIR, name), JSON.stringify({ texts: index.map((e) => e.text.toWellFormed()), vecs: index.map((e) => b64(e.vec)) }));
  let rank: Rank | null = null;
  if (WASM) {
    rank = loadRank(fs.readFileSync(WASM));
    for (const e of index) rank.push(e.text, e.vec);
  }
  s = { name, rank };
  seen.set(index, s);
  return s;
}

export function hooked<R extends Result>(fn: "token" | "cosine", index: Entry[], arg: string | Float32Array, topK: number, ts: () => R): R {
  if (!DIR && !WASM) return ts();
  const s = stateFor(index);
  if (s.rank) {
    calls++;
    if (process.env.CANON_RANK_WASM_LOG) fs.writeFileSync(process.env.CANON_RANK_WASM_LOG, `${calls}\n`);
    const hits = typeof arg === "string" ? s.rank.tokenRank(arg, topK) : s.rank.cosineRank(arg, topK);
    return hits.map(([i, score]) => ({ entry: index[i], score })) as R;
  }
  const out = ts();
  const expect = out.map((h) => [index.indexOf(h.entry), scoreBits(h.score)]);
  const line =
    typeof arg === "string"
      ? { kind: "token", class: "fixture", index: s.name, query: arg.toWellFormed(), top_k: topK, expect }
      : { kind: "cosine", class: "fixture", index: s.name, q: b64(arg), top_k: topK, expect };
  fs.appendFileSync(path.join(DIR, "fixture-calls.jsonl"), JSON.stringify(line) + "\n");
  return out;
}
