import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const APP = readFileSync(resolve(import.meta.dir, "app.css"), "utf8");
const ROS = readFileSync(resolve(import.meta.dir, "ros.css"), "utf8");
const BRAND = readFileSync(resolve(import.meta.dir, "brand.css"), "utf8");
const TOKENS = readFileSync(resolve(import.meta.dir, "../../../src/styles/brand-tokens.css"), "utf8");
const WEB = readFileSync(resolve(import.meta.dir, "../../../src/app/globals.css"), "utf8");

function block(css: string, start: RegExp): string {
  const m = start.exec(css);
  if (!m) throw new Error(`missing ${start}`);
  const from = css.indexOf("{", m.index + m[0].length - 1) + 1;
  let depth = 1;
  let i = from;
  while (depth > 0 && i < css.length) {
    if (css[i] === "{") depth++;
    if (css[i] === "}") depth--;
    i++;
  }
  return css.slice(from, i - 1);
}

function vars(text: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const m of text.matchAll(/--([\w-]+):\s*([^;]+);/g)) out[m[1]] = m[2].trim();
  return out;
}

function resolveColor(v: Record<string, string>, name: string): string {
  let value = v[name];
  for (let n = 0; n < 6 && value?.startsWith("var("); n++) value = v[value.slice(6, -1)];
  if (!value || !/^#[0-9a-f]{6}$/i.test(value)) throw new Error(`${name} is ${value}`);
  return value;
}

function luminance(hex: string): number {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrast(a: string, b: string): number {
  const [x, y] = [luminance(a), luminance(b)].sort((p, q) => q - p);
  return (x + 0.05) / (y + 0.05);
}

const appLight = vars(block(APP, /:root\s*\{/));
const appDark = vars(block(block(APP, /@media \(prefers-color-scheme: dark\)\s*\{/), /:root\s*\{/));
const rosBase = vars(block(ROS, /\.ros\s*\{/));
const rosDark = vars(block(block(ROS, /@media \(prefers-color-scheme: dark\)\s*\{/), /\.ros\s*\{/));
const shared = vars(block(TOKENS, /:root\s*\{/));
const sharedDark = vars(block(TOKENS, /:root\[data-scheme="dark"\]\s*\{/));
const skin = vars(block(BRAND, /:root\[data-skin="brand"\]\s*\{/));
const web = { ...shared, ...vars(block(WEB, /:root\s*\{/)) };

const THEMES: [string, Record<string, string>][] = [
  ["desktop light", { ...appLight, ...rosBase }],
  ["desktop dark", { ...appLight, ...appDark, ...rosBase, ...rosDark }],
  ["web", web],
];

const BRAND_THEMES: [string, Record<string, string>][] = [
  ["brand light", { ...appLight, ...shared, ...skin }],
  ["brand dark", { ...appLight, ...appDark, ...shared, ...sharedDark, ...skin }],
];

const TEXT = ["ink", "ink-2", "ink-3", "accent", "ok", "bad", "r1", "r2", "r3", "r4"];
const SURFACES = ["paper", "panel", "bone-2"];

const BRAND_PAIRS: [string, string, string][] = [
  ...TEXT.flatMap((fg) => SURFACES.map((bg): [string, string, string] => [`${fg} text on ${bg}`, fg, bg])),
  ["text on a warning banner", "ink", "warn-bg"],
  ["primary button, pill and selected chip", "on-gold", "gold"],
  ["accent fill with its ink", "accent-ink", "accent"],
  ["ghost button and chip", "ink", "bone"],
];

const PAIRS: [string, string, string][] = [
  ["selected chip and create button", "on-gold", "gold"],
  ["unselected chip and preset", "basalt", "bone"],
  ["chip hover", "basalt", "bone-2"],
  ["secondary text on surface", "basalt-2", "bone"],
];

describe("language system controls meet WCAG AA", () => {
  for (const [theme, v] of THEMES)
    for (const [what, fg, bg] of PAIRS)
      test(`${theme}: ${what}`, () => {
        expect(contrast(resolveColor(v, fg), resolveColor(v, bg))).toBeGreaterThanOrEqual(4.5);
      });
});

describe("shared brand tokens meet WCAG AA on every desktop surface", () => {
  for (const [theme, v] of BRAND_THEMES)
    for (const [what, fg, bg] of BRAND_PAIRS)
      test(`${theme}: ${what}`, () => {
        expect(contrast(resolveColor(v, fg), resolveColor(v, bg))).toBeGreaterThanOrEqual(4.5);
      });
});

describe("the site and the desktop read one token set", () => {
  test("the site imports the shared tokens and keeps no copy of the palette", () => {
    expect(WEB).toContain('@import "../styles/brand-tokens.css";');
    for (const name of ["basalt", "bone", "gold", "gold-deep", "aegean", "crimson"]) expect(vars(block(WEB, /:root\s*\{/))[name]).toBeUndefined();
  });

  test("dark tokens redefine every surface and text primitive", () => {
    for (const name of ["basalt", "basalt-2", "stone-ink", "bone", "bone-1", "bone-2", "gold", "gold-ink", "on-gold", "on-gold-ink", "crimson", "laurel-deep", "papyrus"]) expect(sharedDark[name]).toBeDefined();
  });
});
