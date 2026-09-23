#!/usr/bin/env node

import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync, unlinkSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..", "..");

const SRC = path.join(repoRoot, "public/textures/earth/2k_earth_daymap.jpg");
const OUT_BIN = path.join(repoRoot, "public/textures/earth/landmask-2k.bin");
const OUT_JSON = path.join(repoRoot, "public/textures/earth/landmask-2k.json");
const TMP_RAW = path.join(repoRoot, "public/textures/earth/.landmask-build-tmp.rgb");

const THRESHOLD = 90;

function magickIdentify(file) {
  const out = execFileSync("magick", ["identify", "-format", "%w %h", file], {
    encoding: "utf8",
  });
  const [w, h] = out.trim().split(/\s+/).map(Number);
  return { width: w, height: h };
}

function main() {
  if (!existsSync(SRC)) {
    console.error(`build-landmask: source image not found at ${SRC}`);
    process.exit(1);
  }

  const { width, height } = magickIdentify(SRC);
  console.log(`build-landmask: source is ${width}x${height}`);

  execFileSync("magick", [SRC, "-depth", "8", `RGB:${TMP_RAW}`]);

  const raw = readFileSync(TMP_RAW);
  const expectedBytes = width * height * 3;
  if (raw.length !== expectedBytes) {
    unlinkSync(TMP_RAW);
    console.error(
      `build-landmask: expected ${expectedBytes} raw bytes, got ${raw.length}`
    );
    process.exit(1);
  }

  const pixelCount = width * height;
  const packed = Buffer.alloc(Math.ceil(pixelCount / 8));
  let landCount = 0;

  for (let i = 0; i < pixelCount; i++) {
    const o = i * 3;
    const r = raw[o];
    const g = raw[o + 1];
    const b = raw[o + 2];
    const y = 0.299 * r + 0.587 * g + 0.114 * b;
    const isOcean = b > r + 25 && b > g + 10;
    const isLand = !isOcean && y > THRESHOLD;
    if (isLand) {
      landCount++;
      const byteIndex = i >> 3;
      const bitIndex = 7 - (i & 7);
      packed[byteIndex] |= 1 << bitIndex;
    }
  }

  unlinkSync(TMP_RAW);
  writeFileSync(OUT_BIN, packed);

  const header = {
    width,
    height,
    threshold: THRESHOLD,
    format: "1bit-packed",
    bitOrder: "msb-first",
    rowMajor: true,
    pixelIndex: "y * width + x",
    source: "public/textures/earth/2k_earth_daymap.jpg",
  };
  writeFileSync(OUT_JSON, JSON.stringify(header, null, 2) + "\n");

  const landPct = ((landCount / pixelCount) * 100).toFixed(1);
  console.log(
    `build-landmask: ${landCount}/${pixelCount} land pixels (${landPct}%)`
  );
  console.log(`build-landmask: wrote ${OUT_BIN} (${packed.length} bytes)`);
  console.log(`build-landmask: wrote ${OUT_JSON}`);
}

main();
