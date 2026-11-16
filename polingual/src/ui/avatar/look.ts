export const INK = "#231F20";

export const PIGMENTS = {
  parchment: "#F6EEDC",
  tyrian: "#5B1A4A",
  vermilion: "#D9381E",
  ochre: "#E9A23B",
  lapis: "#26428B",
  malachite: "#1E7A5A",
  maya: "#6FB7C2",
} as const;

export const SKINS = {
  porcelain: "#F8E6D2",
  sand: "#F0CFA0",
  honey: "#DCA466",
  clay: "#B8723F",
  umber: "#7E4B2B",
  cocoa: "#4E2E1F",
  parchment: "#F6EEDC",
  maya: "#9ED2D9",
} as const;

export type Pigment = keyof typeof PIGMENTS;
export type Skin = keyof typeof SKINS;

export const LAYERS = {
  backdrop: ["none", "parchment", "tyrian", "vermilion", "ochre", "lapis", "malachite", "maya"],
  plinth: ["parchment", "tyrian", "vermilion", "ochre", "lapis", "malachite", "maya"],
  shape: ["round", "tall", "bell", "block"],
  skin: ["porcelain", "sand", "honey", "clay", "umber", "cocoa", "parchment", "maya"],
  color: ["vermilion", "lapis", "ochre", "malachite", "maya", "tyrian", "parchment"],
  outfit: ["none", "scarf", "stripe", "sash", "vest", "bowtie", "cape"],
  face: ["smile", "grin", "wow", "wink", "shy", "proud", "sleepy", "starry"],
  hat: ["none", "beret", "cap", "beanie", "fez", "sombrero", "laurel", "crown"],
  accessory: ["none", "glasses", "shades", "monocle", "pin", "medal", "headphones"],
  frame: ["none", "ring", "sparkle", "laurel", "rays", "crest"],
} as const;

export type Layer = keyof typeof LAYERS;
export type Look = { [K in Layer]: (typeof LAYERS)[K][number] };

export const LAYER_ORDER: readonly Layer[] = ["backdrop", "plinth", "shape", "skin", "color", "outfit", "face", "hat", "accessory", "frame"];

export const DEFAULT_LOOK: Look = {
  backdrop: "none",
  plinth: "lapis",
  shape: "round",
  skin: "sand",
  color: "vermilion",
  outfit: "none",
  face: "smile",
  hat: "none",
  accessory: "none",
  frame: "none",
};

export const LABELS: Record<string, string> = {
  none: "None", round: "Round", tall: "Tall", bell: "Bell", block: "Block",
  porcelain: "Porcelain", sand: "Sand", honey: "Honey", clay: "Clay", umber: "Umber", cocoa: "Cocoa",
  parchment: "Parchment", tyrian: "Tyrian", vermilion: "Vermilion", ochre: "Ochre", lapis: "Lapis", malachite: "Malachite", maya: "Maya",
  scarf: "Scarf", stripe: "Sailor stripe", sash: "Sash", vest: "Vest", bowtie: "Bow tie", cape: "Cape",
  smile: "Smile", grin: "Grin", wow: "Wow", wink: "Wink", shy: "Shy", proud: "Proud", sleepy: "Sleepy", starry: "Starry",
  beret: "Beret", cap: "Cap", beanie: "Beanie", fez: "Fez", sombrero: "Sombrero", laurel: "Laurel", crown: "Crown",
  glasses: "Glasses", shades: "Shades", monocle: "Monocle", pin: "Flag pin", medal: "Medal", headphones: "Headphones",
  ring: "Ring", sparkle: "Sparkle", rays: "Rays", crest: "Crest",
};

const TIER_FRAMES: Look["frame"][] = ["none", "none", "ring", "ring", "sparkle", "laurel", "rays", "crest"];

export function frameForTier(tier: number): Look["frame"] {
  return TIER_FRAMES[Math.max(0, Math.min(TIER_FRAMES.length - 1, Math.floor(tier) - 1))] ?? "none";
}

const HEX_TO_NAME: Record<string, string> = Object.fromEntries(Object.entries(PIGMENTS).map(([k, v]) => [v.toLowerCase(), k]));

function pickValid<K extends Layer>(layer: K, v: unknown): Look[K] | undefined {
  if (typeof v !== "string") return undefined;
  const name = HEX_TO_NAME[v.toLowerCase()] ?? v;
  return (LAYERS[layer] as readonly string[]).includes(name) ? (name as Look[K]) : undefined;
}

export function isValidLook(v: unknown): v is Look {
  if (!v || typeof v !== "object") return false;
  const o = v as Record<string, unknown>;
  return LAYER_ORDER.every((k) => typeof o[k] === "string" && (LAYERS[k] as readonly string[]).includes(o[k] as string));
}

export function normalizeLook(input?: Partial<Record<Layer, unknown>> | null, base: Look = DEFAULT_LOOK): Look {
  const out = { ...base } as Record<Layer, string>;
  if (!input) return out as Look;
  for (const k of LAYER_ORDER) {
    const v = pickValid(k, input[k]);
    if (v) out[k] = v;
  }
  return out as Look;
}

function hash(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

function rng(seed: number): () => number {
  let a = seed;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function lookFromSeed(seed: string): Look {
  const r = rng(hash(seed.trim().toLowerCase() || "polly"));
  const pick = <T,>(a: readonly T[]) => a[Math.floor(r() * a.length)];
  const color = pick(LAYERS.color.filter((c) => c !== "parchment"));
  const plinth = pick(LAYERS.plinth.filter((p) => p !== color && p !== "parchment"));
  const backdrop = pick(["parchment", "maya", "ochre", "malachite", "lapis", "tyrian", "vermilion"].filter((b) => b !== color && b !== plinth)) as Look["backdrop"];
  return {
    backdrop,
    plinth,
    shape: pick(LAYERS.shape),
    skin: pick(LAYERS.skin.filter((s) => s !== "maya")),
    color,
    outfit: r() < 0.3 ? "none" : pick(LAYERS.outfit.filter((o) => o !== "cape")),
    face: pick(["smile", "grin", "wow", "wink", "shy", "proud"] as const),
    hat: r() < 0.35 ? "none" : pick(["beret", "cap", "beanie", "fez", "sombrero"] as const),
    accessory: r() < 0.6 ? "none" : pick(["glasses", "pin", "headphones", "monocle"] as const),
    frame: "none",
  };
}

export function onPigment(p: string): string {
  return p === "parchment" || p === "ochre" || p === "maya" ? INK : PIGMENTS.parchment;
}

export function accentFor(color: string): Pigment {
  return color === "ochre" ? "vermilion" : "ochre";
}
