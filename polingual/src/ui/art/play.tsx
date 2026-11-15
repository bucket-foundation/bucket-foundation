import type { ArtName } from "./index";

type WorldGround = "paper" | "tyrian" | "lapis" | "malachite" | "ochre" | "vermilion";
type WorldPattern = "dots" | "lattice" | "azulejo-grid" | "girih" | "kente" | "stripes";
type WorldPiece = "flag-tile" | "ticket" | "seal" | "torn-label" | "kente" | "azulejo";
type WorldDecor = { art: ArtName; x: number; y: number; size: number; tilt: number };

export type World = {
  id: string;
  name: string;
  caption: string;
  ground: WorldGround;
  pattern: WorldPattern;
  accent: string;
  piece: WorldPiece;
  hero: ArtName;
  decor: WorldDecor[];
  stage: ArtName[];
};

const v = (name: string) => `var(--pl-${name})`;

export const WORLDS = {
  duel: { id: "duel", stage: ["ticket","seal","bunting","azulejo","pebble","script-ru"], name: "Flag Duel", caption: "TEN ROUNDS · TWO QUESTIONS", ground: "vermilion", pattern: "dots", accent: v("tyrian"), piece: "flag-tile", hero: "bunting", decor: [{ art: "seal", x: 6, y: 18, size: 13, tilt: -9 }, { art: "ticket", x: 74, y: 10, size: 20, tilt: 7 }, { art: "star", x: 56, y: 58, size: 9, tilt: 14 }, { art: "pebble", x: 88, y: 60, size: 8, tilt: -18 }] },
  "same-word": { id: "same-word", stage: ["seal","torn-label","script-he","ticket","script-ko","pebble"], name: "Same Word", caption: "ONE MEANING · MANY TONGUES", ground: "paper", pattern: "dots", accent: v("vermilion"), piece: "seal", hero: "seal", decor: [{ art: "ticket", x: 70, y: 14, size: 20, tilt: -6 }, { art: "torn-label", x: 50, y: 56, size: 17, tilt: 5 }, { art: "script-he", x: 92, y: 12, size: 6, tilt: 12 }, { art: "script-ru", x: 38, y: 16, size: 7, tilt: -14 }, { art: "pebble", x: 88, y: 58, size: 8, tilt: 22 }] },
  flags: { id: "flags", stage: ["bunting","flag-band","seal","pebble","star","kente"], name: "Flags", caption: "WHOSE WORD IS THIS", ground: "malachite", pattern: "stripes", accent: v("ochre"), piece: "flag-tile", hero: "flag-band", decor: [{ art: "bunting", x: 58, y: 6, size: 26, tilt: 4 }, { art: "pebble", x: 88, y: 54, size: 9, tilt: -14 }, { art: "star", x: 44, y: 60, size: 8, tilt: 10 }, { art: "seal", x: 6, y: 52, size: 10, tilt: -8 }] },
  tiles: { id: "tiles", stage: ["azulejo","azulejo-grid","blocks","star","seal","girih"], name: "Tiles", caption: "TAP EVERY MATCH", ground: "lapis", pattern: "azulejo-grid", accent: v("ochre"), piece: "azulejo", hero: "azulejo", decor: [{ art: "blocks", x: 70, y: 18, size: 16, tilt: -6 }, { art: "azulejo-grid", x: 46, y: 52, size: 14, tilt: 8 }, { art: "star", x: 90, y: 60, size: 8, tilt: 16 }] },
  "flag-tiles": { id: "flag-tiles", stage: ["kente","bunting","flag-band","pebble","seal","star"], name: "Flag Tiles", caption: "DAILY RUN · TAP THE FLAG", ground: "paper", pattern: "kente", accent: v("malachite"), piece: "kente", hero: "kente", decor: [{ art: "flag-band", x: 60, y: 10, size: 24, tilt: -4 }, { art: "bunting", x: 40, y: 54, size: 18, tilt: 6 }, { art: "pebble", x: 90, y: 54, size: 8, tilt: 20 }] },
  "voice-atlas": { id: "voice-atlas", stage: ["ticket","azulejo","seal","star","script-ru","pebble"], name: "Voice Atlas", caption: "HEAR IT · PIN IT", ground: "lapis", pattern: "girih", accent: v("maya"), piece: "ticket", hero: "ticket", decor: [{ art: "azulejo", x: 74, y: 12, size: 14, tilt: 10 }, { art: "star", x: 54, y: 56, size: 9, tilt: -12 }, { art: "seal", x: 90, y: 56, size: 9, tilt: 6 }] },
  "word-snake": { id: "word-snake", stage: ["brush","kente","seal","pebble","script-ko","torn-label"], name: "Word Snake", caption: "EAT YOUR LANGUAGE", ground: "malachite", pattern: "dots", accent: v("ochre"), piece: "torn-label", hero: "brush", decor: [{ art: "kente", x: 62, y: 50, size: 22, tilt: -16 }, { art: "pebble", x: 82, y: 10, size: 10, tilt: 18 }, { art: "script-ko", x: 46, y: 14, size: 6, tilt: -10 }] },
  forehead: { id: "forehead", stage: ["streak-flame","star","seal","ticket","pebble","bunting"], name: "Forehead", caption: "PARTY MODE · ONE PHONE", ground: "vermilion", pattern: "dots", accent: v("ochre"), piece: "ticket", hero: "ticket", decor: [{ art: "streak-flame", x: 74, y: 12, size: 9, tilt: 8 }, { art: "star", x: 54, y: 56, size: 9, tilt: -16 }, { art: "seal", x: 88, y: 54, size: 10, tilt: 10 }] },
  "babel-match": { id: "babel-match", stage: ["blocks","seal","torn-label","script-ru","girih","script-he"], name: "Babel Match", caption: "THREE MEANINGS CLEAR", ground: "tyrian", pattern: "girih", accent: v("ochre"), piece: "seal", hero: "blocks", decor: [{ art: "seal", x: 70, y: 12, size: 12, tilt: -8 }, { art: "torn-label", x: 48, y: 56, size: 17, tilt: 6 }, { art: "script-ru", x: 90, y: 60, size: 7, tilt: 14 }] },
  shift: { id: "shift", stage: ["torn-label","script-ru","script-ko","ticket","seal","script-he"], name: "Shift", caption: "DAILY BOARD · SLIDE TO SPELL", ground: "ochre", pattern: "dots", accent: v("tyrian"), piece: "torn-label", hero: "torn-label", decor: [{ art: "script-ru", x: 68, y: 12, size: 8, tilt: -10 }, { art: "script-ko", x: 86, y: 56, size: 6, tilt: 12 }, { art: "ticket", x: 46, y: 54, size: 16, tilt: -5 }] },
  ispy: { id: "ispy", stage: ["azulejo","pebble","brush","star","seal","ticket"], name: "I Spy", caption: "FIND IT BEFORE THE BOTS", ground: "paper", pattern: "dots", accent: v("lapis"), piece: "azulejo", hero: "star", decor: [{ art: "azulejo", x: 72, y: 10, size: 12, tilt: 9 }, { art: "pebble", x: 50, y: 56, size: 9, tilt: -14 }, { art: "brush", x: 86, y: 52, size: 14, tilt: 6 }] },
  polyword: { id: "polyword", stage: ["streak-flame","streak-pot","seal","ticket","torn-label","script-ko"], name: "Polyword", caption: "ONE WORD A DAY", ground: "tyrian", pattern: "lattice", accent: v("vermilion"), piece: "seal", hero: "streak-flame", decor: [{ art: "streak-pot", x: 72, y: 16, size: 10, tilt: -6 }, { art: "seal", x: 52, y: 56, size: 10, tilt: 8 }, { art: "ticket", x: 84, y: 54, size: 16, tilt: -9 }] },
  "daily-set": { id: "daily-set", stage: ["bunting","star","calligraphy-yong","blocks","seal","pebble"], name: "Daily Set", caption: "SIX WORDS · SAME FOR EVERYONE", ground: "ochre", pattern: "dots", accent: v("tyrian"), piece: "flag-tile", hero: "bunting", decor: [{ art: "star", x: 70, y: 12, size: 9, tilt: 12 }, { art: "blocks", x: 48, y: 54, size: 14, tilt: -8 }, { art: "seal", x: 88, y: 56, size: 9, tilt: 7 }] },
  mini: { id: "mini", stage: ["girih","brush","azulejo-grid","script-ru","seal","pebble"], name: "Mini", caption: "A SMALL CROSSWORD A DAY", ground: "lapis", pattern: "girih", accent: v("ochre"), piece: "azulejo", hero: "azulejo-grid", decor: [{ art: "brush", x: 70, y: 14, size: 14, tilt: -6 }, { art: "script-ru", x: 50, y: 56, size: 7, tilt: 10 }, { art: "pebble", x: 88, y: 56, size: 8, tilt: 16 }] },
  "word-groups": { id: "word-groups", stage: ["sk-kente","sk-mudcloth","sk-paisley","calligraphy-ain","seal","star"], name: "Word Groups", caption: "SIXTEEN WORDS · FOUR GROUPS", ground: "malachite", pattern: "kente", accent: v("ochre"), piece: "kente", hero: "sk-kente", decor: [{ art: "sk-paisley", x: 70, y: 12, size: 12, tilt: 8 }, { art: "calligraphy-ain", x: 50, y: 56, size: 10, tilt: -6 }, { art: "star", x: 88, y: 58, size: 8, tilt: 14 }] },
  "speed-match": { id: "speed-match", stage: ["streak-flame","streak-pot","star","ink-dot","ticket","pebble"], name: "Speed Match", caption: "FIFTEEN PAIRS · SIXTY SECONDS", ground: "vermilion", pattern: "stripes", accent: v("ochre"), piece: "ticket", hero: "streak-flame", decor: [{ art: "streak-pot", x: 72, y: 14, size: 10, tilt: -6 }, { art: "star", x: 52, y: 56, size: 9, tilt: 12 }, { art: "ink-dot", x: 88, y: 56, size: 8, tilt: 8 }] },
  "which-voice": { id: "which-voice", stage: ["script-he","seal","script-ko","torn-label","ticket","star"], name: "Which Voice", caption: "LISTEN · PICK THE FLAG", ground: "tyrian", pattern: "lattice", accent: v("maya"), piece: "seal", hero: "torn-label", decor: [{ art: "script-he", x: 70, y: 14, size: 7, tilt: 8 }, { art: "seal", x: 50, y: 56, size: 10, tilt: -8 }, { art: "script-ko", x: 88, y: 58, size: 6, tilt: 12 }] },
  "letter-sprint": { id: "letter-sprint", stage: ["calligraphy-ain","calligraphy-yong","brush","script-ru","seal","pebble"], name: "Letter Sprint", caption: "HEAR A SOUND · FIND THE LETTER", ground: "paper", pattern: "dots", accent: v("vermilion"), piece: "torn-label", hero: "calligraphy-yong", decor: [{ art: "calligraphy-ain", x: 70, y: 12, size: 12, tilt: -8 }, { art: "brush", x: 50, y: 56, size: 14, tilt: 6 }, { art: "script-ru", x: 88, y: 58, size: 7, tilt: 12 }] },
} satisfies Record<string, World>;

export type WorldId = keyof typeof WORLDS;

export function world(id: WorldId): World {
  return WORLDS[id];
}

export function CoinArt({ size = 24, className }: { size?: number; className?: string }) {
  return (
    <svg viewBox="0 0 40 44" width={size} height={(size * 44) / 40} className={className} aria-hidden="true" style={{ overflow: "visible", verticalAlign: "middle" }}>
      <ellipse cx="20" cy="24" rx="18" ry="18" fill="var(--pl-ochre-deep)" stroke="var(--pl-ink)" strokeWidth="2.5" />
      <circle cx="20" cy="20" r="18" fill="var(--pl-ochre)" stroke="var(--pl-ink)" strokeWidth="2.5" />
      <circle cx="20" cy="20" r="12.5" fill="none" stroke="var(--pl-ochre-deep)" strokeWidth="2" />
      <path d="M20 11.5l2.6 6 6 2.5-6 2.6-2.6 6-2.6-6-6-2.6 6-2.5z" fill="var(--pl-card)" stroke="var(--pl-ink)" strokeWidth="1.2" />
    </svg>
  );
}
