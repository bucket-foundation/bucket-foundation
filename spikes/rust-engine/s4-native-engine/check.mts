import { readFileSync } from "node:fs";
import { join, resolve } from "node:path";

const dir = resolve(process.argv[2] ?? join(import.meta.dir, "..", ".data", "s4"));
const exe = process.platform === "win32" ? ".exe" : "";
const bin = resolve(process.argv[3] ?? join(import.meta.dir, "..", "target", "release", `engine-min${exe}`));
const want = JSON.parse(readFileSync(join(dir, "expected.json"), "utf8")) as { pack: string; excerpts: number; top_k: number; expected: Record<string, [number, number][]> };
let equal = 0;
for (const [q, rows] of Object.entries(want.expected)) {
  const run = Bun.spawnSync([bin, join(dir, "canon.db"), q, String(want.top_k * 3)]);
  if (run.exitCode !== 0) throw new Error(`engine-min failed on ${q}: ${run.stderr.toString()}`);
  const got = JSON.parse(run.stdout.toString()) as { pack: string; excerpts: number; results: [number, number][] };
  if (got.pack !== want.pack || got.excerpts !== want.excerpts) throw new Error(`pack mismatch on ${q}`);
  if (JSON.stringify(got.results.slice(0, want.top_k)) !== JSON.stringify(rows)) throw new Error(`results differ on ${q}`);
  equal++;
}
console.log(JSON.stringify({ queries: equal, equal_to_typescript: equal, pack: want.pack, excerpts: want.excerpts }));
