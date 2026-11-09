import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";
import sharp from "sharp";

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const master = readFileSync(join(root, "brand/logo-v2/master.svg"), "utf8");
const FIELD = "#0E0C09";

const small = master
  .replace(/<g id="strings"[\s\S]*?<\/g>/, '<line x1="120" y1="48" x2="120" y2="172" stroke="url(#string)" stroke-width="14" stroke-linecap="round"/>')
  .replace(/<rect x="34" y="29"[^>]*\/>/, "")
  .replace(/<circle cx="116.5"[^>]*\/>/, "")
  .replace("translate(116 98) scale(3.3)", "translate(44 23) scale(3.9)");

const rounded = (svg) => svg.replace('<rect id="field"', '<rect id="field" rx="228"');
const transparent = (svg) => svg.replace(/<rect id="field"[^>]*\/>/, "");
const markOnly = (svg) =>
  transparent(svg)
    .replace('viewBox="0 0 1024 1024"', 'viewBox="152 153 720 720"');

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
  <defs><radialGradient id="ogf" cx="30%" cy="40%" r="90%"><stop offset="0" stop-color="#2A2219"/><stop offset="1" stop-color="${FIELD}"/></radialGradient></defs>
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
const foreground = transparent(master).replace('translate(116 98) scale(3.3)', "translate(224 211) scale(2.4)");
const circle = master.replace('<rect id="field"', '<circle cx="512" cy="512" r="512" fill="url(#field-g)"/><rect id="unused"').replace(/<rect id="unused"[^>]*\/>/, "");
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
