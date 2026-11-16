#!/usr/bin/env node
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const LOCK = "brand/logo/icons.lock.json";
const MASTER = 1024;
const SAFE_ZONE = 0.6;
const MEAN_TOLERANCE = 2;
const DENSITIES = { mdpi: 1, hdpi: 1.5, xhdpi: 2, xxhdpi: 3, xxxhdpi: 4 };
const MAC_SIZES = [16, 32, 64, 128, 256, 512];
const ICNS_TYPES = [["icp4", 16], ["icp5", 32], ["ic11", 32], ["ic12", 64], ["ic07", 128], ["ic13", 256], ["ic08", 256], ["ic14", 512], ["ic09", 512], ["ic10", 1024]];

const GLYPHS = {
  "0": "01110 10001 10011 10101 11001 10001 01110",
  "1": "00100 01100 00100 00100 00100 00100 01110",
  "2": "01110 10001 00001 00010 00100 01000 11111",
  "3": "11110 00001 00001 01110 00001 00001 11110",
  "4": "00010 00110 01010 10010 11111 00010 00010",
  "5": "11111 10000 11110 00001 00001 10001 01110",
  "6": "00110 01000 10000 11110 10001 10001 01110",
  "7": "11111 00001 00010 00100 01000 01000 01000",
  "8": "01110 10001 10001 01110 10001 10001 01110",
  "9": "01110 10001 10001 01111 00001 00010 01100",
  A: "01110 10001 10001 11111 10001 10001 10001",
  B: "11110 10001 10001 11110 10001 10001 11110",
  E: "11111 10000 10000 11110 10000 10000 11111",
  T: "11111 00100 00100 00100 00100 00100 00100",
  ".": "00000 00000 00000 00000 00000 01100 01100",
  "-": "00000 00000 00000 11111 00000 00000 00000",
  " ": "00000 00000 00000 00000 00000 00000 00000",
};

function appleSet(dir) {
  return [
    { group: "apple", kind: "png", shape: "square", size: 1024, path: `${dir}/icon-1024.png` },
    ...MAC_SIZES.map((size) => ({ group: "apple", kind: "png", shape: "square", size, path: `${dir}/mac-${size}.png` })),
  ];
}

function androidAdaptive(res) {
  const xml = (name) => ({ group: "android", kind: "adaptive-xml", path: `${res}/mipmap-anydpi-v26/${name}.xml` });
  return [
    xml("ic_launcher"),
    xml("ic_launcher_round"),
    { group: "android", kind: "color-xml", path: `${res}/values/ic_launcher_background.xml` },
    ...Object.entries(DENSITIES).map(([d, k]) => ({ group: "android", kind: "png", shape: "foreground", size: 108 * k, path: `${res}/mipmap-${d}/ic_launcher_foreground.png` })),
  ];
}

function androidLegacy(res) {
  return Object.entries(DENSITIES).flatMap(([d, k]) => [
    { group: "android", kind: "png", shape: "rounded", size: 48 * k, path: `${res}/mipmap-${d}/ic_launcher.png` },
    { group: "android", kind: "png", shape: "circle", size: 48 * k, path: `${res}/mipmap-${d}/ic_launcher_round.png` },
  ]);
}

function tauriSet(dir) {
  return [
    { group: "desktop", kind: "png", shape: "rounded", size: 32, path: `${dir}/32x32.png` },
    { group: "desktop", kind: "png", shape: "rounded", size: 128, path: `${dir}/128x128.png` },
    { group: "desktop", kind: "png", shape: "rounded", size: 256, path: `${dir}/128x128@2x.png` },
    { group: "desktop", kind: "png", shape: "rounded", size: 512, path: `${dir}/icon.png` },
    { group: "desktop", kind: "ico", shape: "rounded", path: `${dir}/icon.ico` },
    { group: "desktop", kind: "icns", shape: "rounded", path: `${dir}/icon.icns` },
  ];
}

export const PRODUCTS = {
  bucket: {
    source: "brand/logo/bucket/current.svg",
    targets: [
      { group: "web", kind: "svg", shape: "rounded", path: "src/app/icon.svg" },
      { group: "web", kind: "png", shape: "rounded", size: 512, path: "src/app/icon.png" },
      { group: "web", kind: "png", shape: "square", size: 180, path: "src/app/apple-icon.png" },
      { group: "web", kind: "ico", shape: "rounded", path: "src/app/favicon.ico" },
      { group: "web", kind: "card", path: "src/app/opengraph-image.png" },
      { group: "web", kind: "card", path: "src/app/twitter-image.png" },
      ...appleSet("apple/Bucket/Resources/Assets.xcassets/AppIcon.appiconset"),
      { group: "apple", kind: "png", shape: "square", size: 1024, path: "apple/Bucket/Watch/Assets.xcassets/AppIcon.appiconset/icon-1024.png" },
      { group: "apple", kind: "png", shape: "square", size: 1024, path: "packages/bkt-mobile/ios/App/App/Assets.xcassets/AppIcon.appiconset/AppIcon-512@2x.png" },
      ...androidAdaptive("packages/bkt-mobile/android/app/src/main/res"),
      ...androidLegacy("packages/bkt-mobile/android/app/src/main/res"),
      ...androidAdaptive("android/bucket/src/main/res"),
      ...tauriSet("packages/bkt-desktop/src-tauri/icons"),
    ],
  },
  polingual: {
    source: "brand/logo/polingual/current.svg",
    targets: [
      { group: "web", kind: "svg", shape: "rounded", path: "polingual/src/app/icon.svg" },
      { group: "web", kind: "svg", shape: "rounded", path: "polingual/public/logo.svg" },
      { group: "web", kind: "svg", shape: "rounded", path: "polingual/public/d8/mark-pl.svg" },
      { group: "web", kind: "ico", shape: "rounded", path: "polingual/public/favicon.ico" },
      { group: "web", kind: "png", shape: "square", size: 180, path: "polingual/public/d8/icon-180.png" },
      { group: "web", kind: "png", shape: "rounded", size: 192, path: "polingual/public/d8/icon-192.png" },
      { group: "web", kind: "png", shape: "rounded", size: 512, path: "polingual/public/d8/icon-512.png" },
      { group: "web", kind: "png", shape: "square", size: 1024, path: "polingual/public/brand/kit/app-icon-1024.png" },
      ...appleSet("apple/Polingual/Resources/Assets.xcassets/AppIcon.appiconset"),
      { group: "apple", kind: "png", shape: "square", size: 1024, path: "apple/Polingual/Watch/Assets.xcassets/AppIcon.appiconset/icon-1024.png" },
      ...androidAdaptive("android/polingual/src/main/res"),
      ...tauriSet("packages/polingual-desktop/src-tauri/icons"),
    ],
  },
};

export function parseSource(text) {
  const open = text.match(/<svg\b[^>]*>/);
  const box = open && open[0].match(/viewBox="0 0 ([\d.]+) ([\d.]+)"/);
  if (!box || box[1] !== box[2]) throw new Error("logo source needs a square viewBox that starts at 0 0");
  const groundTag = text.match(/<rect\b[^>]*\bid="ground"[^>]*\/>/);
  const fill = groundTag && groundTag[0].match(/fill="(#[0-9A-Fa-f]{6})"/);
  if (!fill) throw new Error('logo source needs <rect id="ground" fill="#RRGGBB"/>');
  const radius = Number((open[0].match(/data-radius="([\d.]+)"/) || [0, 0])[1]);
  const inner = text.slice(open.index + open[0].length, text.lastIndexOf("</svg>")).replace(/<title>[^<]*<\/title>/, "").trim();
  return { box: Number(box[1]), ground: fill[1].toUpperCase(), groundTag: groundTag[0], radius, inner };
}

export function compose(src, { shape = "square", scale = 1, overlay = "" } = {}) {
  const n = src.box;
  const body = shape === "foreground" ? src.inner.replace(src.groundTag, "") : src.inner;
  const clip = shape === "rounded" && src.radius > 0 ? `<rect width="${n}" height="${n}" rx="${n * src.radius}"/>` : shape === "circle" ? `<circle cx="${n / 2}" cy="${n / 2}" r="${n / 2}"/>` : "";
  const move = scale === 1 ? "" : ` transform="translate(${n / 2} ${n / 2}) scale(${scale}) translate(${-n / 2} ${-n / 2})"`;
  const defs = clip ? `<defs><clipPath id="shape">${clip}</clipPath></defs>` : "";
  const layer = overlay ? `<svg viewBox="0 0 ${MASTER} ${MASTER}" width="${n}" height="${n}">${overlay}</svg>` : "";
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${n} ${n}" width="${MASTER}" height="${MASTER}">${defs}<g${clip ? ' clip-path="url(#shape)"' : ""}><g${move}>${body}</g>${layer}</g></svg>\n`;
}

export function badgeLabel(value, today = new Date()) {
  if (value === true || value === "") value = today.toISOString().slice(0, 10);
  const date = String(value).match(/^\d{4}-(\d{2})-(\d{2})$/);
  const label = (date ? `BETA ${date[1]}.${date[2]}` : String(value)).toUpperCase();
  for (const ch of label) if (!GLYPHS[ch]) throw new Error(`badge supports only ${Object.keys(GLYPHS).join("")}`);
  return label;
}

export function badgeOverlay(label, shape) {
  const cols = label.length * 6 - 1;
  const cell = Math.min(16, Math.floor((MASTER * (shape === "foreground" ? 0.5 : 0.84)) / cols));
  const band = cell * 11;
  const top = shape === "foreground" ? MASTER * 0.56 : MASTER - band;
  const left = Math.round((MASTER - cols * cell) / 2);
  let cells = "";
  [...label].forEach((ch, i) => {
    GLYPHS[ch].split(" ").forEach((row, y) => {
      [...row].forEach((bit, x) => {
        if (bit === "1") cells += `<rect x="${left + (i * 6 + x) * cell}" y="${top + (y + 2) * cell}" width="${cell}" height="${cell}"/>`;
      });
    });
  });
  return `<rect x="0" y="${top}" width="${MASTER}" height="${band}" fill="#161616"/><g fill="#FFFFFF">${cells}</g>`;
}

export function ico(images) {
  const head = Buffer.alloc(6 + 16 * images.length);
  head.writeUInt16LE(1, 2);
  head.writeUInt16LE(images.length, 4);
  let offset = head.length;
  images.forEach(({ size, png }, i) => {
    const at = 6 + 16 * i;
    head.writeUInt8(size >= 256 ? 0 : size, at);
    head.writeUInt8(size >= 256 ? 0 : size, at + 1);
    head.writeUInt16LE(1, at + 4);
    head.writeUInt16LE(32, at + 6);
    head.writeUInt32LE(png.length, at + 8);
    head.writeUInt32LE(offset, at + 12);
    offset += png.length;
  });
  return Buffer.concat([head, ...images.map((i) => i.png)]);
}

export function icns(images) {
  const parts = images.map(({ type, png }) => {
    const head = Buffer.alloc(8);
    head.write(type, 0, "ascii");
    head.writeUInt32BE(png.length + 8, 4);
    return Buffer.concat([head, png]);
  });
  const head = Buffer.alloc(8);
  head.write("icns", 0, "ascii");
  head.writeUInt32BE(8 + parts.reduce((n, p) => n + p.length, 0), 4);
  return Buffer.concat([head, ...parts]);
}

function adaptiveXml() {
  return `<?xml version="1.0" encoding="utf-8"?>\n<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android">\n    <background android:drawable="@color/ic_launcher_background"/>\n    <foreground android:drawable="@mipmap/ic_launcher_foreground"/>\n</adaptive-icon>\n`;
}

function colorXml(ground) {
  return `<?xml version="1.0" encoding="utf-8"?>\n<resources>\n    <color name="ic_launcher_background">${ground}</color>\n</resources>\n`;
}

function loadSharp() {
  for (const base of [ROOT, path.join(ROOT, "polingual")]) {
    try {
      return createRequire(path.join(base, "package.json"))("sharp");
    } catch {
      continue;
    }
  }
  return null;
}

function renderer(sharp, src, badge) {
  const masters = new Map();
  let fit;
  async function foregroundScale() {
    if (fit) return fit;
    const size = 256;
    const { data } = await sharp(Buffer.from(compose(src, { shape: "foreground" }))).resize(size, size).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    let reach = 0;
    for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) if (data[(y * size + x) * 4 + 3] > 8) reach = Math.max(reach, Math.abs(x + 0.5 - size / 2), Math.abs(y + 0.5 - size / 2));
    if (reach === 0) throw new Error("logo source has no mark outside its ground");
    fit = Math.min(1, Number(((SAFE_ZONE * size) / 2 / reach).toFixed(3)));
    return fit;
  }
  async function master(shape, withBadge) {
    const key = `${shape}:${withBadge}`;
    if (!masters.has(key)) {
      const scale = shape === "foreground" ? await foregroundScale() : 1;
      const overlay = withBadge && badge ? badgeOverlay(badge, shape) : "";
      masters.set(key, await sharp(Buffer.from(compose(src, { shape, scale, overlay }))).resize(MASTER, MASTER).png().toBuffer());
    }
    return masters.get(key);
  }
  async function png(shape, size, withBadge) {
    let img = sharp(await master(shape, withBadge)).resize(size, size, { kernel: "lanczos3" });
    if (shape === "square") img = img.flatten({ background: src.ground }).removeAlpha();
    return img.png({ compressionLevel: 9 }).toBuffer();
  }
  async function card() {
    const mark = await sharp(await master("foreground", false)).resize(630, 630, { kernel: "lanczos3" }).png().toBuffer();
    return sharp({ create: { width: 1200, height: 630, channels: 3, background: src.ground } }).composite([{ input: mark, left: 285, top: 0 }]).png({ compressionLevel: 9 }).toBuffer();
  }
  return async function render(t) {
    const badged = t.group !== "web";
    if (t.kind === "svg") return Buffer.from(compose(src, { shape: t.shape }));
    if (t.kind === "adaptive-xml") return Buffer.from(adaptiveXml());
    if (t.kind === "color-xml") return Buffer.from(colorXml(src.ground));
    if (t.kind === "png") return png(t.shape, t.size, badged);
    if (t.kind === "card") return card();
    if (t.kind === "ico") return ico(await Promise.all([16, 32, 48].map(async (size) => ({ size, png: await png(t.shape, size, badged) }))));
    if (t.kind === "icns") return icns(await Promise.all(ICNS_TYPES.map(async ([type, size]) => ({ type, png: await png(t.shape, size, badged) }))));
    throw new Error(`unknown target kind ${t.kind}`);
  };
}

const sha = (buf) => createHash("sha256").update(buf).digest("hex");
const abs = (rel) => path.join(ROOT, rel);

async function meanDifference(sharp, a, b) {
  const [x, y] = await Promise.all([a, b].map((buf) => sharp(buf).ensureAlpha().raw().toBuffer({ resolveWithObject: true })));
  if (x.info.width !== y.info.width || x.info.height !== y.info.height) return Infinity;
  let sum = 0;
  for (let i = 0; i < x.data.length; i++) sum += Math.abs(x.data[i] - y.data[i]);
  return sum / x.data.length;
}

function parseArgs(argv) {
  const args = { products: Object.keys(PRODUCTS), groups: null, check: false, soft: false, badge: null };
  for (let i = 0; i < argv.length; i++) {
    const [flag, inline] = argv[i].split("=");
    const value = () => inline ?? argv[++i];
    if (flag === "--check") args.check = true;
    else if (flag === "--soft") args.soft = true;
    else if (flag === "--product") args.products = value().split(",");
    else if (flag === "--only") args.groups = value().split(",");
    else if (flag === "--badge") args.badge = badgeLabel(inline ?? (argv[i + 1] && !argv[i + 1].startsWith("--") ? argv[++i] : true));
    else throw new Error(`unknown argument ${argv[i]}`);
  }
  for (const p of args.products) if (!PRODUCTS[p]) throw new Error(`unknown product ${p}`);
  return args;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const sharp = loadSharp();
  const lockPath = abs(LOCK);
  const lock = existsSync(lockPath) ? JSON.parse(readFileSync(lockPath, "utf8")) : {};
  const problems = [];
  if (!sharp && !args.check) {
    if (args.soft) {
      for (const name of args.products) console.warn(`brand icons: WARNING skipped ${name}, sharp is not installed, the committed ${name} icons stay`);
      return;
    }
    throw new Error("sharp is not installed, run npm ci at the repo root");
  }
  if (!sharp && args.check && !args.soft) throw new Error("sharp is not installed, run npm ci at the repo root");
  for (const name of args.products) {
    const product = PRODUCTS[name];
    if (!existsSync(abs(product.source))) {
      if (args.soft) {
        console.warn(`brand icons: WARNING skipped ${name}, ${product.source} is not in this checkout, the committed ${name} icons stay`);
        continue;
      }
      throw new Error(`${product.source} is missing`);
    }
    const text = readFileSync(abs(product.source), "utf8");
    const targets = product.targets.filter((t) => !args.groups || args.groups.includes(t.group));
    const render = sharp ? renderer(sharp, parseSource(text), args.check ? null : args.badge) : null;
    const entry = lock[name] ?? { source: "", outputs: {} };
    if (args.check) {
      if (entry.source !== sha(text)) problems.push(`${product.source} changed after the last icon build`);
      for (const known of Object.keys(entry.outputs)) if (!product.targets.some((t) => t.path === known)) problems.push(`${known} is in the lock and no longer a target`);
    }
    for (const t of targets) {
      const file = abs(t.path);
      if (!args.check) {
        const out = await render(t);
        mkdirSync(path.dirname(file), { recursive: true });
        writeFileSync(file, out);
        entry.outputs[t.path] = sha(out);
        continue;
      }
      if (!existsSync(file)) {
        problems.push(`${t.path} is missing`);
        continue;
      }
      const committed = readFileSync(file);
      if (entry.outputs[t.path] !== sha(committed)) {
        problems.push(`${t.path} differs from the icon lock`);
        continue;
      }
      if (!render) continue;
      const fresh = await render(t);
      if (t.kind === "png" || t.kind === "card") {
        const diff = await meanDifference(sharp, committed, fresh);
        if (diff > MEAN_TOLERANCE) problems.push(`${t.path} drifts from ${product.source} by ${diff.toFixed(2)} per channel`);
      } else if (t.kind !== "ico" && t.kind !== "icns" && !committed.equals(fresh)) {
        problems.push(`${t.path} drifts from ${product.source}`);
      }
    }
    if (!args.check && !args.badge) {
      entry.source = sha(text);
      lock[name] = entry;
    }
    if (!args.check) console.log(`brand icons: wrote ${targets.length} ${name} files${args.badge ? ` with badge ${args.badge}` : ""}`);
  }
  if (args.check) {
    if (problems.length) {
      console.error(problems.join("\n"));
      console.error("run npm run brand:icons and commit the result");
      process.exit(1);
    }
    if (!sharp) for (const name of args.products) console.warn(`brand icons: WARNING skipped the ${name} render comparison, sharp is not installed, lock hashes only`);
    console.log("brand icons: committed icons match their sources");
  } else if (!args.badge) {
    writeFileSync(lockPath, `${JSON.stringify(lock, null, 2)}\n`);
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch((err) => {
    console.error(`brand icons: ${err.message}`);
    process.exit(1);
  });
}
