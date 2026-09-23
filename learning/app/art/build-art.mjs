#!/usr/bin/env node
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

function minify(svg) {
  return svg.replace(/>\s+</g, "><").replace(/\s{2,}/g, " ").trim();
}

mkdirSync(cacheDir, { recursive: true });
const files = readdirSync(corpusDir).filter((f) => f.endsWith(".json"));
let totalAtoms = 0, totalCurves = 0, totalBytes = 0;

for (const file of files) {
  const data = JSON.parse(readFileSync(join(corpusDir, file), "utf8"));
  const atoms = data.atoms || [];
  if ((data.meta || {}).kind === "language") continue;

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
