import { mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { rankCanon } from "../../../src/lib/canon-rank";
import { CanonStore, syncCanon } from "../../../packages/bkt/src/canon";
import { newDataKey } from "../../../packages/bkt/src/crypto";
import type { CanonPack } from "../../../packages/bkt/src/pack/canon";
import { Store } from "../../../packages/bkt/src/store";

const dir = resolve(process.argv[2] ?? join(import.meta.dir, "..", ".data", "s4"));
const packPath = resolve(process.argv[3] ?? join(import.meta.dir, "..", "..", "..", "packages", "bkt", "content", "canon.json"));
const QUERIES = ["entropy", "speed of light", "structured water", "c.elegans (worm)", "zzqxv"];
const TOP_K = 10;

mkdirSync(dir, { recursive: true });
const dbPath = join(dir, "canon.db");
for (const suffix of ["", "-wal", "-shm"]) rmSync(dbPath + suffix, { force: true });
const pack = JSON.parse(readFileSync(packPath, "utf8")) as CanonPack;
const store = new Store(dbPath, newDataKey());
syncCanon(store.db, pack);
const canon = new CanonStore(store.db);
const expected: Record<string, [number, number][]> = {};
for (const q of QUERIES) {
  const found = rankCanon({ loadIndex: () => canon.index(), decodeQVec: () => null }, { q, qvec: null, topK: TOP_K, tier: "all", branch: "", mode: "hybrid" });
  expected[q] = found.ok ? found.results.map((r) => [r.entry.rowid, r.score]) : [];
}
store.db.run("pragma wal_checkpoint(truncate)");
store.close();
writeFileSync(join(dir, "expected.json"), JSON.stringify({ pack: pack.version, excerpts: pack.excerpts.length, top_k: TOP_K, expected }));
console.log(JSON.stringify({ db: dbPath, pack: pack.version, excerpts: pack.excerpts.length, pack_bytes: Buffer.byteLength(JSON.stringify(pack)), queries: QUERIES.length }));
