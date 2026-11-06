import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const css = readFileSync(resolve(import.meta.dir, "stone-tokens.css"), "utf8");
const [lightBlock, darkBlock] = css.split("@media (prefers-color-scheme: dark)");

function hexes(block: string) {
  const out: Record<string, string> = {};
  for (const m of block.matchAll(/--stone-([\w-]+):\s*(#[0-9a-f]{6})\b/gi)) out[m[1]] = m[2];
  return out;
}

const light = hexes(lightBlock);
const dark = { ...light, ...hexes(darkBlock) };

const rgb = (h: string) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
const mix = (a: string, b: string, wa: number) => {
  const [x, y] = [rgb(a), rgb(b)];
  return "#" + x.map((v, i) => Math.round(v * wa + y[i] * (1 - wa)).toString(16).padStart(2, "0")).join("");
};
const lum = (h: string) => {
  const [r, g, b] = rgb(h).map((v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
export const contrast = (a: string, b: string) => {
  const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
};

const TEXT = 4.5;
const UI = 3;
const surfaces = ["ground", "face", "face-hi", "groove"];

for (const [name, t] of [["light", light], ["dark", dark]] as const) {
  describe(`stone tokens ${name}`, () => {
    const pairs: [string, string, string, number][] = [];
    for (const s of surfaces) for (const ink of ["ink", "ink-2", "ink-3", "wrong", "moss"]) pairs.push([ink, s, t[s], TEXT]);
    pairs.push(["patina-ink", "patina", t.patina, TEXT]);
    pairs.push(["patina-ink", "primary top stop", mix(t.patina, "#ffffff", 0.85), TEXT]);
    pairs.push(["gold-ink", "gold", t.gold, TEXT]);
    pairs.push(["gold-ink", "gold-hi", t["gold-hi"], TEXT]);
    pairs.push(["patina", "face", t.face, TEXT]);
    for (const s of ["ground", "face", "face-hi"]) pairs.push(["ink", `${s} focus ring`, t[s], UI]);
    for (const [fg, label, bg, min] of pairs) {
      test(`${fg} on ${label} reaches ${min}:1`, () => {
        expect(contrast(t[fg], bg)).toBeGreaterThanOrEqual(min);
      });
    }
  });
}
