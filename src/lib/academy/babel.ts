import type { LangItem } from "./lang-systems";
import { unit } from "./lobby-bots";
import { seededRandom } from "./lobbies";

export const BABEL_MEANINGS = 5;

export interface BabelMeaning {
  id: string;
  meaning: string;
  forms: Record<string, string>;
}

export function babelLevel(input: string | null): number | null {
  if (!input || !/^[1-9][0-9]{0,2}$/.test(input)) return null;
  return Number(input);
}

export function babelMeanings(items: readonly LangItem[], langs: readonly string[], level: number, root = "en", count = BABEL_MEANINGS): BabelMeaning[] {
  const rand = seededRandom(String(Math.floor(unit(`babel:${langs.join(",")}:${level}`) * 2 ** 52) + 1));
  const pool = items.filter((i) => i.kind === "word" && i.forms[root] && langs.every((l) => i.forms[l] && i.forms[l].length <= 14) && new Set(langs.map((l) => i.forms[l].toLowerCase())).size === langs.length);
  const out: BabelMeaning[] = [];
  const used = new Set<string>();
  for (let tries = 0; out.length < count && tries < 2000 && pool.length; tries++) {
    const item = pool[Math.floor(rand() * Math.min(pool.length, 600))];
    const key = item.forms[root].toLowerCase();
    if (used.has(key)) continue;
    used.add(key);
    out.push({ id: item.id, meaning: item.forms[root], forms: Object.fromEntries(langs.map((l) => [l, item.forms[l]])) });
  }
  return out;
}
