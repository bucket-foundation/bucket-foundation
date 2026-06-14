#!/usr/bin/env node
/* Bucket Academy — build-time procedural-art generator + cache.
 *
 * Pre-renders the deterministic SVG anchor for every atom in every corpus using the
 * SAME generator the app calls at runtime (art-gen.js), so the figures are inspectable
 * and lintable at build time (the load-bearing-art contract's automated-review hook).
 *
 * Output: learning/app/art/cache/<branch>.json  — { "<atomId>": {svg, alt}, ... }
 * The app falls back to live generation if a cache entry is missing, so this step is
 * an OPTIMISATION + INSPECTION artifact, never a hard dependency. $0, no GPU, no API.
 *
 * Usage:  node learning/app/art/build-art.mjs
 */
import { readFileSync, writeFileSync, mkdirSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const here = dirname(fileURLToPath(import.meta.url));
const appDir = join(here, "..");
const corpusDir = join(appDir, "corpus");
const cacheDir = join(here, "cache");

const BucketArt = require(join(here, "art-gen.js"));

// tiny SVGO-lite: collapse whitespace between tags + trim. Deterministic, no deps.
function minify(svg) {
  return svg.replace(/>\s+</g, "><").replace(/\s{2,}/g, " ").trim();
}

mkdirSync(cacheDir, { recursive: true });
const files = readdirSync(corpusDir).filter((f) => f.endsWith(".json"));
let totalAtoms = 0, totalCurves = 0, totalBytes = 0;

for (const file of files) {
  const data = JSON.parse(readFileSync(join(corpusDir, file), "utf8"));
  const atoms = data.atoms || [];
  // language corpora have no concept figures — skip
  if ((data.meta || {}).kind === "language") continue;

  // mirror engine leverage cheaply (out-degree from requires) so tree motifs size right
  const byId = {};
  atoms.forEach((a) => (byId[a.id] = a));
  const unlocks = {};
  atoms.forEach((a) => (a.requires || []).forEach((r) => { (unlocks[r] = unlocks[r] || []).push(a.id); }));
  let maxU = 1;
  atoms.forEach((a) => { maxU = Math.max(maxU, (unlocks[a.id] || []).length); });

  const out = {};
  for (const a of atoms) {
    const lev = (unlocks[a.id] || []).length / maxU;
    const { svg, alt } = BucketArt.svgFor({ ...a, leverage: a.leverage != null ? a.leverage : lev });
    const min = minify(svg);
    out[a.id] = { svg: min, alt };
    totalBytes += min.length;
    totalAtoms++;
    if (BucketArt.recognise(a.equation)) totalCurves++;
  }
  const branch = (data.meta || {}).branch || file.replace(/\.json$/, "");
  writeFileSync(join(cacheDir, branch + ".json"), JSON.stringify(out));
  console.log(`  ${file} → cache/${branch}.json (${atoms.length} atoms)`);
}

console.log(
  `[build-art] ${totalAtoms} figures (${totalCurves} real curves, ${totalAtoms - totalCurves} schematics), ` +
  `avg ${Math.round(totalBytes / Math.max(1, totalAtoms))} bytes/fig, deterministic.`
);
