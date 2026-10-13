import { tokenRank, type ClaimIndexEntry } from "../../../src/lib/canon-rank";
import { TEXTS } from "./texts.mts";

const [mode, arg] = process.argv.slice(2);
const target = `${process.platform}-${process.arch}`;
if (mode !== "search") {
  console.error("usage: baseline search <query>");
  process.exit(2);
}
const none = new Float32Array(0);
const index: ClaimIndexEntry[] = TEXTS.map((text, rowid) => ({ rowid, branch: "", concept: "", slug: "", title: "", path: "", text, vec: none }));
const results = tokenRank(index, arg ?? "entropy light", 5).map((h) => [h.entry.rowid, h.score]);
console.log(JSON.stringify({ engine: "typescript", target, bun: Bun.version, since_start_ms: Math.round(performance.now() * 100) / 100, results }));
