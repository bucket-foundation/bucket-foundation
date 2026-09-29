import * as fs from "fs";
import * as path from "path";

const ROOT = path.join(__dirname, "..");
const manifest = JSON.parse(fs.readFileSync(path.join(ROOT, "src/data/canon-embeddings.json"), "utf8"));
const timeline = JSON.parse(fs.readFileSync(path.join(ROOT, "src/data/canon-timeline.json"), "utf8"));
const sites = JSON.parse(fs.readFileSync(path.join(ROOT, "src/data/canon-sites.json"), "utf8"));
const figures = JSON.parse(fs.readFileSync(path.join(ROOT, "canon-figures/figures.json"), "utf8"));

let failed = 0;
function check(name: string, cond: boolean, detail = "") {
  console.log(`${cond ? "PASS" : "FAIL"}  ${name}${detail ? ` :: ${detail}` : ""}`);
  if (!cond) failed++;
}

const TOP_KEYS = [
  "bin", "dim", "dtype", "generatedAt", "inputSha256", "items", "model", "n", "normalized",
  "rank_version", "revision", "schema", "sources",
];
const ITEM_KEYS = ["branch", "id", "kind", "rank", "theta", "title", "year"];

check("schema snapshot: top-level keys", JSON.stringify(Object.keys(manifest).sort()) === JSON.stringify(TOP_KEYS), Object.keys(manifest).sort().join(","));
check("schema id", manifest.schema === "bucket.canon-embeddings/v1");
check("model pinned", manifest.model === "BAAI/bge-small-en-v1.5" && /^[0-9a-f]{40}$/.test(manifest.revision));
check("rank_version set", typeof manifest.rank_version === "string" && manifest.rank_version.length > 0);
check("generatedAt ISO", !Number.isNaN(Date.parse(manifest.generatedAt)));
check("dim 384", manifest.dim === 384);

const items = manifest.items as Record<string, unknown>[];
check("schema snapshot: item keys", items.every((it) => JSON.stringify(Object.keys(it).sort()) === JSON.stringify(ITEM_KEYS)));
const expectedN = timeline.events.length + sites.sites.length + figures.figures.length;
check("n covers timeline + sites + figures", manifest.n === expectedN && items.length === expectedN, `${manifest.n} vs ${expectedN}`);
check("ids unique", new Set(items.map((i) => i.id)).size === items.length);

const eventIds = new Set<string>(timeline.events.map((e: { id: string }) => e.id));
const itemIds = new Set(items.map((i) => i.id as string));
check("every timeline marker id kept verbatim", Array.from(eventIds).every((id) => itemIds.has(id)));

const ranks = items.map((i) => i.rank as number).sort((a, b) => a - b);
check("rank is a permutation of 0..n-1", ranks.every((r, i) => r === i));
check("theta = 2 pi rank / n", items.every((i) => Math.abs((i.theta as number) - (2 * Math.PI * (i.rank as number)) / manifest.n) < 1e-5));

const bin = fs.readFileSync(path.join(ROOT, "src/data", manifest.bin));
check("bin size = n * dim * 4", bin.length === manifest.n * manifest.dim * 4, `${bin.length}`);
const v = new Float32Array(bin.buffer, bin.byteOffset, manifest.dim);
const norm = Math.sqrt(v.reduce((s, x) => s + x * x, 0));
check("vectors normalized", Math.abs(norm - 1) < 1e-3, norm.toFixed(4));

if (failed) {
  console.error(`${failed} failed`);
  process.exit(1);
}
