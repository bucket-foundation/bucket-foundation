import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";
import sharp from "sharp";

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const pick = process.argv[2];
if (!pick) {
  console.error("usage: node scripts/brand/build-logo.mjs <finalist-id>");
  process.exit(1);
}
const master = readFileSync(join(root, `public/brand/logo-finalists/${pick}.svg`), "utf8");
const FIELD = master.match(/stop offset="1" stop-color="(#[0-9A-Fa-f]{6})"/)[1];
const FIELD_HI = master.match(/stop offset="0" stop-color="(#[0-9A-Fa-f]{6})"/)[1];

const small = master;

const rounded = (svg) => svg.replace(/<rect width="1024" height="1024"/g, '<rect width="1024" height="1024" rx="228"');
const transparent = (svg) => svg.replace(/<rect width="1024" height="1024"[^>]*\/>/g, "");
const markOnly = (svg) =>
  transparent(svg)
    .replace('viewBox="0 0 1024 1024"', 'viewBox="192 183 640 640"');

const out = (p) => {
  const f = join(root, p);
  mkdirSync(dirname(f), { recursive: true });
  return f;
};

const png = async (svg, size, path, { flatten = false, height } = {}) => {
  let img = sharp(Buffer.from(svg), { density: 600 }).resize(size, height ?? size);
  if (flatten) img = img.flatten({ background: FIELD });
  await img.png().toFile(out(path));
};

const og = (w, h) => {
  const mark = transparent(master)
    .replace(/<\?xml[^>]*>/, "")
    .replace('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024">', `<svg x="90" y="${(h - 420) / 2}" width="420" height="420" viewBox="0 0 1024 1024">`);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
  <defs><radialGradient id="ogf" cx="30%" cy="40%" r="90%"><stop offset="0" stop-color="${FIELD_HI}"/><stop offset="1" stop-color="${FIELD}"/></radialGradient></defs>
  <rect width="${w}" height="${h}" fill="url(#ogf)"/>
  ${mark}
  <text x="548" y="${h / 2 - 10}" font-family="Noto Serif, serif" font-size="62" fill="#F3E3B8">bucket.foundation</text>
  <text x="550" y="${h / 2 + 56}" font-family="Noto Serif, serif" font-style="italic" font-size="34" fill="#D9A43A">free to read · paid to cite</text>
  <text x="552" y="${h / 2 + 118}" font-family="Noto Serif, serif" font-size="20" letter-spacing="6" fill="#9C9584">BUILD THE PAST. BUILD HISTORY.</text>
</svg>`;
};

writeFileSync(out("src/app/icon.svg"), rounded(small));
writeFileSync(out("public/brand/logo/mark.svg"), markOnly(master));
writeFileSync(out("public/brand/logo/app-icon.svg"), master);
writeFileSync(out("brand/logo-master.svg"), master);

await png(master, 512, "src/app/icon.png", { flatten: true });
await png(master, 180, "src/app/apple-icon.png", { flatten: true });
await png(master, 1024, "public/brand/omega-lyre-gold.png", { flatten: true });
await png(markOnly(master), 1024, "public/brand/logo/mark-hero.png", {});
await png(master, 1024, "packages/bkt-mobile/ios/App/App/Assets.xcassets/AppIcon.appiconset/AppIcon-512@2x.png", { flatten: true });

const ico = [16, 32, 48];
for (const s of ico) await png(rounded(small), s, `.logo-tmp/fav-${s}.png`);
execFileSync("magick", [...ico.map((s) => out(`.logo-tmp/fav-${s}.png`)), out("src/app/favicon.ico")]);

await sharp(Buffer.from(og(1200, 630))).png().toFile(out("src/app/opengraph-image.png"));
await sharp(Buffer.from(og(1200, 630))).png().toFile(out("src/app/twitter-image.png"));

const res = "packages/bkt-mobile/android/app/src/main/res";
const dens = { mdpi: 1, hdpi: 1.5, xhdpi: 2, xxhdpi: 3, xxxhdpi: 4 };
const foreground = transparent(master).replace("translate(162 140) scale(7)", "translate(252 242) scale(5.2)");
const circle = master.replace(/<rect width="1024" height="1024"/g, '<rect width="1024" height="1024" rx="512"');
for (const [d, k] of Object.entries(dens)) {
  await png(master, 48 * k, `${res}/mipmap-${d}/ic_launcher.png`, { flatten: true });
  await png(circle, 48 * k, `${res}/mipmap-${d}/ic_launcher_round.png`);
  await png(foreground, 108 * k, `${res}/mipmap-${d}/ic_launcher_foreground.png`);
}
writeFileSync(
  out(`${res}/values/ic_launcher_background.xml`),
  `<?xml version="1.0" encoding="utf-8"?>\n<resources>\n    <color name="ic_launcher_background">${FIELD}</color>\n</resources>\n`,
);
execFileSync("rm", ["-rf", out(".logo-tmp")]);
console.log("logo assets built");
