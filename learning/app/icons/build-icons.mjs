#!/usr/bin/env node
/* Rasterize the on-brand maskable SVG into the PNG icons iOS/Android actually use.
 * iOS ignores SVG icons, so a real apple-touch-icon.png + 192/512 maskable PNGs are
 * required for installs to look correct (GRAPHICS-RENDERING.md §3.6). Uses sharp. */
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const here = dirname(fileURLToPath(import.meta.url));
const svg = readFileSync(join(here, "icon-maskable.svg"));

const out = [
  ["icon-192.png", 192],
  ["icon-512.png", 512],
  ["apple-touch-icon.png", 180],
];

for (const [name, size] of out) {
  await sharp(svg, { density: 384 }).resize(size, size).png().toFile(join(here, name));
  console.log("  wrote icons/" + name + " (" + size + "px)");
}
console.log("[build-icons] done");
