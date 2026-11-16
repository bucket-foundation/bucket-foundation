import type { LangItem, Reading } from "./lang-systems";
import { LANG_CODES } from "./lang-systems";
import { seededRandom } from "./lobbies";

export const FOREHEAD_CARDS = 60;
export const FOREHEAD_SECONDS = 60;

export interface ForeheadCard {
  lang: string;
  form: string;
  meaning: string;
  reading: Reading | null;
  itemId: string;
}

export function foreheadLangs(input: string | null): string[] | null {
  if (!input) return null;
  const langs = Array.from(new Set(input.split(",").map((s) => s.trim()).filter(Boolean)));
  if (langs.length < 1 || langs.length > 6 || !langs.every((l) => LANG_CODES.includes(l))) return null;
  return langs;
}

export function foreheadSeed(input: string | null): string | null {
  if (!input) return null;
  return /^[1-9][0-9]{0,15}$/.test(input) ? input : null;
}

export function foreheadDeck(items: readonly LangItem[], langs: readonly string[], seed: string, root = "en", size = FOREHEAD_CARDS): ForeheadCard[] {
  const rand = seededRandom(seed);
  const pool = items.filter((i) => i.kind === "word" && i.forms[root] && langs.some((l) => i.forms[l] && i.forms[l] !== i.forms[root]));
  const out: ForeheadCard[] = [];
  const used = new Set<string>();
  const order = pool.slice();
  for (let i = order.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [order[i], order[j]] = [order[j], order[i]];
  }
  for (const item of order) {
    if (out.length >= size) break;
    if (used.has(item.forms[root].toLowerCase())) continue;
    const options = langs.filter((l) => item.forms[l] && item.forms[l] !== item.forms[root]);
    const lang = options[Math.floor(rand() * options.length)];
    if (!lang || item.forms[lang].length > 24) continue;
    used.add(item.forms[root].toLowerCase());
    out.push({ lang, form: item.forms[lang], meaning: item.forms[root], reading: item.readings?.[lang] ?? null, itemId: item.id });
  }
  return out;
}
