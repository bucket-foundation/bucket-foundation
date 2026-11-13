import type { LangItem } from "./lang-systems";
import { BOTS, unit } from "./lobby-bots";
import { seededRandom } from "./lobbies";

export const FT_LANES = 4;
export const FT_DECK = 240;
export const FT_STEP = 10;
export const FT_FALL_START_MS = 3400;
export const FT_FALL_MIN_MS = 1100;
export const FT_FALL_FACTOR = 0.88;
export const FT_POOL = ["es", "fr", "de", "it", "pt", "nl", "sv", "ja", "zh", "ko", "ru", "ar", "hi", "el", "tr"] as const;

export interface FlagTile {
  lang: string;
  form: string;
  meaning: string;
  itemId: string;
}

export interface FlagTilesDeck {
  date: string;
  langs: string[];
  tiles: FlagTile[];
}

export interface Ghost {
  name: string;
  flag: string;
  skill: string;
  score: number;
}

const DATE = /^\d{4}-\d{2}-\d{2}$/;

export function deckDate(input: unknown, now: number): string | null {
  const today = new Date(now).toISOString().slice(0, 10);
  if (input === undefined || input === null || input === "") return today;
  if (typeof input !== "string" || !DATE.test(input) || Number.isNaN(Date.parse(`${input}T00:00:00Z`))) return null;
  return Math.abs(Date.parse(`${input}T00:00:00Z`) - Date.parse(`${today}T00:00:00Z`)) <= 86_400_000 ? input : null;
}

function seedOf(key: string): string {
  return String(Math.floor(unit(key) * 2 ** 52) + 1);
}

function shuffled<T>(xs: readonly T[], rand: () => number): T[] {
  const out = xs.slice();
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

export function flagTilesDeck(items: readonly LangItem[], date: string, root = "en"): FlagTilesDeck {
  const rand = seededRandom(seedOf(`flag-tiles:${date}`));
  const words = items.filter((i) => i.kind === "word" && i.forms[root]);
  const usable = FT_POOL.filter((l) => words.filter((w) => w.forms[l]).length >= 40);
  const langs = shuffled(usable, rand).slice(0, FT_LANES).sort();
  const tiles: FlagTile[] = [];
  const seen = new Set<string>();
  for (const item of shuffled(words.slice(0, 3000), rand)) {
    if (tiles.length >= FT_DECK) break;
    const options = langs.filter((l) => {
      const f = item.forms[l];
      return f && f !== item.forms[root] && langs.every((o) => o === l || item.forms[o] !== f);
    });
    if (!options.length) continue;
    const lang = options[Math.floor(rand() * options.length)];
    const key = `${lang}:${item.forms[lang]}`;
    if (seen.has(key) || item.forms[lang].length > 24) continue;
    seen.add(key);
    tiles.push({ lang, form: item.forms[lang], meaning: item.forms[root], itemId: item.id });
  }
  return { date, langs, tiles };
}

export function fallMs(index: number): number {
  return Math.max(FT_FALL_MIN_MS, Math.round(FT_FALL_START_MS * FT_FALL_FACTOR ** Math.floor(index / FT_STEP)));
}

export function ghosts(date: string, count = 5): Ghost[] {
  const span: Record<string, [number, number]> = { easy: [6, 18], medium: [14, 34], hard: [28, 60] };
  return BOTS.map((b) => ({ b, k: unit(`ghost:${date}:${b.userId}`) }))
    .sort((x, y) => x.k - y.k)
    .slice(0, count)
    .map(({ b }) => {
      const [lo, hi] = span[b.skill];
      return { name: b.name, flag: b.flag, skill: b.skill, score: lo + Math.floor(unit(`ghost-score:${date}:${b.userId}`) * (hi - lo + 1)) };
    })
    .sort((a, b) => b.score - a.score);
}
