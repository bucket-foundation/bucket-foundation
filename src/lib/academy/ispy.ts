import type { LangItem } from "./lang-systems";

export type SpyArt = "torn" | "stamp" | "seal" | "kente" | "azu" | "paisley" | "tag";

export interface SpyObject {
  id: string;
  glyph: string;
  art: SpyArt;
  x: number;
  y: number;
  tilt: number;
}

export interface SpyDecor {
  kind: "script" | "kente" | "azu" | "lattice" | "paisley";
  text?: string;
  x: number;
  y: number;
  size: number;
  tilt: number;
}

export interface SpyScene {
  id: string;
  name: string;
  objects: SpyObject[];
  decor: SpyDecor[];
}

const ARTS: SpyArt[] = ["torn", "stamp", "seal", "kente", "azu", "paisley", "tag"];

function laid(entries: [string, string][], seed: number): SpyObject[] {
  const cols = 5;
  return entries.map(([id, glyph], i) => {
    const r = Math.floor(i / cols);
    const c = i % cols;
    const jitter = ((i * 37 + seed * 11) % 9) - 4;
    return {
      id,
      glyph,
      art: ARTS[(i + seed) % ARTS.length],
      x: 11 + c * 18 + (r % 2 ? 4 : 0) + jitter * 0.5,
      y: 11 + r * 24 + (((i * 13 + seed) % 7) - 3) * 1.2,
      tilt: (((i * 29 + seed * 7) % 21) - 10) * 1.4,
    };
  });
}

const DECOR: SpyDecor[] = [
  { kind: "script", text: "ع", x: 2, y: 4, size: 22, tilt: -8 },
  { kind: "script", text: "永", x: 74, y: 58, size: 20, tilt: 9 },
  { kind: "script", text: "मेला", x: 38, y: 82, size: 7, tilt: -6 },
  { kind: "script", text: "сто", x: 84, y: 6, size: 6, tilt: 18 },
  { kind: "script", text: "מאה", x: 48, y: 2, size: 5, tilt: -12 },
  { kind: "kente", x: -4, y: 90, size: 34, tilt: -3 },
  { kind: "azu", x: 92, y: 84, size: 12, tilt: 8 },
  { kind: "lattice", x: 58, y: 30, size: 26, tilt: 0 },
  { kind: "paisley", x: 0, y: 44, size: 7, tilt: 20 },
];

export const SPY_SCENES: SpyScene[] = [
  {
    id: "market",
    name: "The market",
    decor: DECOR,
    objects: laid(
      [
        ["bread", "🍞"], ["fish", "🐟"], ["apple", "🍎"], ["egg", "🥚"], ["milk", "🥛"],
        ["cheese", "🧀"], ["meat", "🥩"], ["rice", "🍚"], ["orange", "🍊"], ["chicken", "🐔"],
        ["coffee", "☕"], ["tea", "🍵"], ["salt", "🧂"], ["wine", "🍷"], ["money", "💰"],
        ["bag", "👜"], ["knife", "🔪"], ["flower", "🌸"], ["hundred", "💯"], ["cow", "🐄"],
      ],
      0,
    ),
  },
  {
    id: "street",
    name: "The street",
    decor: DECOR,
    objects: laid(
      [
        ["car", "🚗"], ["dog", "🐕"], ["cat", "🐈"], ["house", "🏠"], ["tree", "🌳"],
        ["sun", "☀️"], ["bird", "🐦"], ["horse", "🐎"], ["door", "🚪"], ["window", "🪟"],
        ["hat", "🎩"], ["shoe", "👟"], ["key", "🔑"], ["road", "🛣️"], ["stone", "🪨"],
        ["child", "🧒"], ["star", "⭐"], ["moon", "🌙"], ["city", "🏙️"], ["flower", "🌻"],
      ],
      3,
    ),
  },
  {
    id: "classroom",
    name: "The classroom",
    decor: DECOR,
    objects: laid(
      [
        ["book", "📕"], ["paper", "📄"], ["letter", "✉️"], ["clock", "🕰️"], ["chair", "🪑"],
        ["ball", "⚽"], ["school", "🏫"], ["one", "1️⃣"], ["two", "2️⃣"], ["three", "3️⃣"],
        ["shirt", "👕"], ["apple", "🍏"], ["child", "👧"], ["window", "🪟"], ["door", "🚪"],
        ["bag", "🎒"], ["key", "🗝️"], ["water", "💧"], ["hundred", "💯"], ["hat", "🧢"],
      ],
      5,
    ),
  },
  {
    id: "harbor",
    name: "The harbor",
    decor: DECOR,
    objects: laid(
      [
        ["sea", "🌊"], ["boat", "⛵"], ["fish", "🐠"], ["bird", "🕊️"], ["sun", "🌞"],
        ["mountain", "⛰️"], ["river", "🏞️"], ["water", "💧"], ["stone", "🪨"], ["fire", "🔥"],
        ["star", "🌟"], ["moon", "🌙"], ["house", "🛖"], ["tree", "🌴"], ["dog", "🐕"],
        ["bread", "🥖"], ["wine", "🍷"], ["money", "🪙"], ["hat", "👒"], ["key", "🔑"],
      ],
      2,
    ),
  },
];

export const SPY_ROUND_SECONDS = 12;
export const SPY_BASE = 100;
export const SPY_SPEED = 100;
export const SPY_STREAK_STEP = 25;
export const SPY_STREAK_CAP = 4;

export function spyScene(id: string): SpyScene | null {
  return SPY_SCENES.find((s) => s.id === id) ?? null;
}

export function sceneOfChoices(choices: readonly string[]): SpyScene | null {
  const want = new Set(choices);
  return SPY_SCENES.find((s) => s.objects.length === want.size && s.objects.every((o) => want.has(o.id))) ?? null;
}

export function spyPoints(correct: boolean, ms: number, roundSeconds: number, streak: number): number {
  if (!correct) return 0;
  const len = roundSeconds * 1000;
  const left = Math.max(0, Math.min(1, 1 - ms / len));
  return SPY_BASE + Math.round(SPY_SPEED * left) + Math.min(Math.max(0, streak), SPY_STREAK_CAP) * SPY_STREAK_STEP;
}

export interface SpyRound {
  round: number;
  scene: string;
  lang: string;
  item_id: string;
  mode: "spy";
  gloss: string;
  choices: string[];
  answer: string;
}

function hash(s: string): number {
  let h = 2166136261;
  for (const c of s) h = Math.imul(h ^ c.charCodeAt(0), 16777619) >>> 0;
  return h;
}

function rng(seed: string): () => number {
  let x = hash(seed) || 1;
  return () => {
    x ^= x << 13;
    x >>>= 0;
    x ^= x >>> 17;
    x ^= x << 5;
    x >>>= 0;
    return x / 2 ** 32;
  };
}

function itemFor(items: readonly LangItem[], id: string): LangItem | undefined {
  return items.find((i) => i.kind === "word" && i.id === id) ?? items.find((i) => i.kind === "word" && i.forms.en === id);
}

export function spyRounds(items: readonly LangItem[], opts: { seed: string; root: string; targets: readonly string[]; rounds: number; scene?: string }): SpyRound[] {
  const rand = rng(opts.seed);
  const scene = (opts.scene && spyScene(opts.scene)) || SPY_SCENES[Math.floor(rand() * SPY_SCENES.length)];
  const choices = scene.objects.map((o) => o.id);
  const langs = opts.targets.filter((l) => l !== opts.root);
  if (!langs.length) return [];
  const ids = Array.from(new Set(choices));
  for (let i = ids.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [ids[i], ids[j]] = [ids[j], ids[i]];
  }
  const out: SpyRound[] = [];
  for (const id of ids) {
    if (out.length >= opts.rounds) break;
    const item = itemFor(items, id);
    if (!item) continue;
    const order = langs.map((_, k) => langs[(out.length + k) % langs.length]);
    const lang = order.find((l) => item.forms[l] && item.forms[l] !== item.forms[opts.root]);
    if (!lang) continue;
    out.push({ round: out.length, scene: scene.id, lang, item_id: item.id, mode: "spy", gloss: item.forms[lang], choices, answer: id });
  }
  return out;
}

export function spyCorrect(round: Pick<SpyRound, "answer">, tapped: string): boolean {
  return tapped === round.answer;
}
