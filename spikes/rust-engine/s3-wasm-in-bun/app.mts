import wasmPath from "./rank.wasm" with { type: "file" };
import { loadRank, scoreBits } from "./rank-wasm.cjs";
import { TEXTS } from "./texts.mts";

const [mode, arg] = process.argv.slice(2);
const before = performance.now();
const bytes = new Uint8Array(await Bun.file(wasmPath).arrayBuffer());
const rank = loadRank(bytes);
const loadMs = performance.now() - before;
const target = `${process.platform}-${process.arch}`;

if (mode === "search") {
  for (const t of TEXTS) rank.push(t);
  const results = rank.tokenRank(arg ?? "entropy light", 5);
  console.log(JSON.stringify({ engine: "wasm", target, bun: Bun.version, wasm_bytes: bytes.length, wasm_load_ms: Math.round(loadMs * 1000) / 1000, since_start_ms: Math.round(performance.now() * 100) / 100, results }));
} else if (mode === "cases") {
  const b64 = (s: string) => {
    const b = Buffer.from(s, "base64");
    return new Float32Array(b.buffer, b.byteOffset, b.byteLength / 4).slice();
  };
  const { createReadStream } = await import("node:fs");
  const { createInterface } = await import("node:readline");
  const tally: Record<string, { cases: number; mismatches: number }> = {};
  for await (const line of createInterface({ input: createReadStream(arg), crlfDelay: Infinity })) {
    if (!line) continue;
    const c = JSON.parse(line) as { kind: string; class: string; texts?: string[]; vecs?: string[]; query?: string; q?: string; top_k: number; expect: [number, string][] };
    if (c.kind !== "token" && c.kind !== "cosine") continue;
    if (c.class === "non-finite input") continue;
    rank.reset();
    if (c.kind === "token") for (const t of c.texts!) rank.push(t);
    else for (const v of c.vecs!) rank.push("", b64(v));
    const hits = c.kind === "token" ? rank.tokenRank(c.query!, c.top_k) : rank.cosineRank(b64(c.q!), c.top_k);
    const same = hits.length === c.expect.length && hits.every((h, i) => h[0] === c.expect[i][0] && scoreBits(h[1]) === c.expect[i][1]);
    const row = (tally[`${c.kind}/${c.class}`] ??= { cases: 0, mismatches: 0 });
    row.cases++;
    if (!same) row.mismatches++;
  }
  const total = Object.values(tally).reduce((n, r) => n + r.cases, 0);
  const bad = Object.values(tally).reduce((n, r) => n + r.mismatches, 0);
  console.log(JSON.stringify({ engine: "wasm", target, bun: Bun.version, cases: total, mismatches: bad, by_class: tally }));
  if (bad) process.exit(1);
} else {
  console.error("usage: app search <query> | cases <cases.jsonl>");
  process.exit(2);
}
