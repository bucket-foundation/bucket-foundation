import { execFileSync, spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import sharp from "sharp";

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const REGISTRY = path.join(ROOT, "tools/generations/registry.json");
const OUT = path.join(ROOT, "public/figures");
const MANIFEST = path.join(OUT, "manifest.json");
const MAX_BYTES = 400 * 1024;
const DEFAULTS = { problem: "navier", corpus: "80k" };

const sha = (buf) => createHash("sha256").update(buf).digest("hex");

export function trackedFiles(root = ROOT) {
  return new Set(execFileSync("git", ["-C", root, "ls-files"], { encoding: "utf8", maxBuffer: 1 << 28 }).split("\n").filter(Boolean));
}

export function unpublishedData(g, tracked) {
  return g.data.filter((d) => d.startsWith("~/") || !tracked.has(d));
}

function fill(template, params) {
  return template.replace(/\{([a-z]+)\}/g, (_, k) => params[k] ?? `{${k}}`);
}

async function toWebp(src, dest) {
  for (const [width, quality] of [[1600, 82], [1400, 75], [1200, 70], [1000, 62], [800, 55]]) {
    const buf = await sharp(src, { density: 150 }).flatten({ background: "#fbf7ee" }).resize({ width, withoutEnlargement: true }).webp({ quality }).toBuffer();
    if (buf.length <= MAX_BYTES) {
      fs.writeFileSync(dest, buf);
      const meta = await sharp(buf).metadata();
      return { bytes: buf.length, width: meta.width, height: meta.height };
    }
  }
  throw new Error(`${path.basename(dest)} stays above ${MAX_BYTES} bytes`);
}

async function build(g, tracked) {
  const missing = unpublishedData(g, tracked);
  if (missing.length) return { name: g.name, published: false, missing };
  const params = Object.fromEntries(Object.keys(g.inputs).filter((k) => k in DEFAULTS).map((k) => [k, DEFAULTS[k]]));
  const work = fs.mkdtempSync(path.join(os.tmpdir(), `figure-${g.name}-`));
  const env = { ...process.env, BKT_GEN_OUT: work };
  for (const [k, v] of Object.entries(params)) env[`BKT_GEN_${k.toUpperCase()}`] = v;
  const script = path.join(ROOT, "tools/generations", g.script);
  const runner = g.script.endsWith(".ts") ? (process.env.BKT_BUN ?? "bun") : (process.env.BKT_PYTHON ?? "python3");
  const run = spawnSync(runner, [script], { cwd: ROOT, env, encoding: "utf8" });
  if (run.status !== 0) throw new Error(`${g.name} exited ${run.status}: ${(run.stderr ?? "").trim().split("\n").slice(-3).join(" ")}`);
  const outputs = g.outputs.map((o) => fill(o, params));
  const image = outputs.find((o) => o.endsWith(".png")) ?? outputs.find((o) => o.endsWith(".svg"));
  if (!image) throw new Error(`${g.name} writes no png or svg`);
  const size = await toWebp(path.join(work, image), path.join(OUT, `${g.name}.webp`));
  fs.rmSync(work, { recursive: true, force: true });
  return {
    name: g.name,
    published: true,
    image: `/figures/${g.name}.webp`,
    source_output: image,
    params,
    ran: new Date().toISOString(),
    script_sha256: sha(fs.readFileSync(script)),
    data_sha256: Object.fromEntries(g.data.map((d) => [d, sha(fs.readFileSync(path.join(ROOT, d)))])),
    ...size,
  };
}

async function main() {
  const only = new Set(process.argv.slice(2));
  const reg = JSON.parse(fs.readFileSync(REGISTRY, "utf8"));
  const prior = fs.existsSync(MANIFEST) ? JSON.parse(fs.readFileSync(MANIFEST, "utf8")).figures : [];
  const tracked = trackedFiles();
  fs.mkdirSync(OUT, { recursive: true });
  const figures = [];
  for (const g of reg.generations) {
    const keep = only.size && !only.has(g.name) ? prior.find((p) => p.name === g.name) : null;
    const entry = keep ?? (await build(g, tracked));
    if (!entry.published) fs.rmSync(path.join(OUT, `${g.name}.webp`), { force: true });
    figures.push(entry);
    console.log(`${g.name}: ${entry.published ? `${entry.bytes} bytes` : `waits on ${entry.missing.join(", ")}`}`);
  }
  fs.writeFileSync(MANIFEST, JSON.stringify({ version: 1, figures }, null, 2) + "\n");
}

if (process.argv[1] === new URL(import.meta.url).pathname) await main();
