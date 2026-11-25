import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const here = path.dirname(fileURLToPath(import.meta.url));
export const KIT = path.join(here, "../../brand/bucket/kit.json");
export const OUT = path.join(here, "../../src/styles/brand-tokens.css");

export const ALIASES = {
  aegean: "link", "aegean-deep": "link-deep", "aegean-dark": "link-dark", teal: "link", "teal-deep": "link-deep", "teal-clear": "link-pale",
  gold: "accent", "gold-bright": "accent-bright", "gold-deep": "accent-deep", "gold-dim": "accent-deep", "gold-ink": "accent-text", "gold-dawn": "accent-pale",
  "on-gold": "on-accent", "on-gold-ink": "on-accent-deep",
  basalt: "text", "basalt-2": "text-2", "basalt-3": "text-3", "stone-800": "text-4", ink: "text", "ink-2": "text-2", "ink-3": "text-3",
  parchment: "text", midnight: "text", driftwood: "text-2",
  "stone-ink": "muted", "parchment-dim": "muted-2", "river-stone": "muted-2", "stone-200": "muted-3", "stone-300": "faint", "ink-dim": "muted", "ink-faint": "faint",
  bone: "bg", "morning-fog": "bg", "bone-1": "card", card: "card", "bone-2": "surface", "bone-3": "surface-2", papyrus: "surface-warm",
  "laurel-deep": "success-deep", "laurel-core": "success", laurel: "success", ok: "success", lichen: "sage", verdigris: "teal",
  sandstone: "accent-sand", ochre: "warning", "ochre-ink": "warning-text", marigold: "warning",
  copper: "copper", terracotta: "copper", crimson: "danger", rust: "danger", bad: "danger",
  hairline: "line", line: "line", "line-2": "surface-2", "hairline-bone": "line-inverse", "stone-carve": "line-strong",
};

export function readKit() {
  return JSON.parse(readFileSync(KIT, "utf8"));
}

export function tokensCss(kit) {
  const light = Object.entries(kit.light).map(([k, v]) => `  --bk-${k}: ${v};`);
  const fonts = Object.entries(kit.fonts).filter(([k]) => k !== "href").map(([k, v]) => `  --bk-font-${k}: ${v};`);
  const shape = Object.entries(kit.shape).map(([k, v]) => `  --bk-${k}: ${v};`);
  const aliases = Object.entries(ALIASES).map(([k, v]) => {
    if (!(v in kit.light)) throw new Error(`kit.light is missing ${v}`);
    return `  --${k}: var(--bk-${v});`;
  });
  const legacyFonts = [
    "  --font-display-brand: var(--bk-font-display);",
    "  --font-text-brand: var(--bk-font-body);",
    "  --font-display: var(--bk-font-display);",
    "  --font-fraunces: var(--bk-font-body);",
    "  --font-jetbrains: var(--bk-font-mono);",
  ];
  const dark = Object.entries(kit.dark ?? {}).map(([k, v]) => `  --bk-${k}: ${v};`);
  return `:root {\n${[...light, ...fonts, ...shape, ...legacyFonts, ...aliases].join("\n")}\n}\n\n:root[data-scheme="dark"] {\n${[...dark, "  color-scheme: dark;"].join("\n")}\n}\n`;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) writeFileSync(OUT, tokensCss(readKit()));
