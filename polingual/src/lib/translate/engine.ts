import type { LangCorpus } from "@academy/lang-systems";
import { LANG_CODES } from "@/lib/daily/words";

export interface TranslateHit {
  itemId: string;
  matchedLang: string;
  exact: boolean;
}

export interface TranslateAnswer {
  source: string;
  headword: string;
  rows: Record<string, string>;
  itemId: string;
}

const ARTICLES: Record<string, string[]> = { es: ["el", "la"], fr: ["le", "la"], it: ["il", "la"], pt: ["o", "a"], de: ["der", "die", "das"], nl: ["de", "het"] };

export function foldForSearch(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Mn}/gu, "")
    .replace(/^[^\p{L}\p{N}\p{Sm}]+|[^\p{L}\p{N}\p{Sm}]+$/gu, "");
}

export function translateSearch(corpus: LangCorpus, query: string, langs: ReadonlySet<string> | null = null, limit = 8): TranslateHit[] {
  const q = foldForSearch(query);
  if (!q) return [];
  const buckets: TranslateHit[][] = [[], [], []];
  for (const item of corpus.items) {
    let bestRank = 3;
    let bestLang = "";
    for (const lang of Object.keys(item.forms).sort()) {
      if (langs && !langs.has(lang)) continue;
      const form = item.forms[lang];
      if (!form) continue;
      const f = foldForSearch(form);
      const sp = f.indexOf(" ");
      const head = sp > 0 ? f.slice(0, sp) : null;
      const bare = head && ARTICLES[lang]?.some((a) => foldForSearch(a) === head) ? f.slice(sp + 1) : f;
      const rank = f === q || bare === q ? 0 : f.startsWith(q) || bare.startsWith(q) ? 1 : q.length >= 3 && f.includes(q) ? 2 : 3;
      if (rank < bestRank) {
        bestRank = rank;
        bestLang = lang;
      }
    }
    if (bestRank < 3) buckets[bestRank].push({ itemId: item.id, matchedLang: bestLang, exact: bestRank === 0 });
  }
  const tier = (h: TranslateHit) => corpus.byId.get(h.itemId)?.tier ?? 99;
  const len = (h: TranslateHit) => corpus.byId.get(h.itemId)?.forms[h.matchedLang]?.length ?? 0;
  return buckets.flatMap((b) => b.sort((a, c) => tier(a) - tier(c) || len(a) - len(c))).slice(0, limit);
}

export function translateSources(corpus: LangCorpus, mine: readonly string[]): string[] {
  const present = new Set(corpus.items.flatMap((i) => Object.keys(i.forms)));
  return [...mine.filter((l) => present.has(l)), ...LANG_CODES.filter((l) => present.has(l) && !mine.includes(l))];
}

export function translate(corpus: LangCorpus, query: string, sources: readonly string[], targets: readonly string[]): TranslateAnswer | null {
  if (!query.trim()) return null;
  const hit = translateSearch(corpus, query.trim(), new Set(sources), 1)[0];
  const item = hit?.exact ? corpus.byId.get(hit.itemId) : undefined;
  if (!hit || !item) return null;
  const rows: Record<string, string> = {};
  for (const t of targets) if (t !== hit.matchedLang && item.forms[t]) rows[t] = item.forms[t];
  return Object.keys(rows).length ? { source: hit.matchedLang, headword: item.forms[hit.matchedLang] ?? query, rows, itemId: item.id } : null;
}

export function suggestions(corpus: LangCorpus, query: string, sources: readonly string[], limit = 6): { itemId: string; lang: string; form: string }[] {
  return translateSearch(corpus, query, new Set(sources), limit).map((h) => ({ itemId: h.itemId, lang: h.matchedLang, form: corpus.byId.get(h.itemId)?.forms[h.matchedLang] ?? "" }));
}

const RECENT_KEY = "polingual/translate/recent/v1";

export function pushRecent(storage: Storage | null, lang: string, max = 6): string[] {
  const next = [lang, ...readRecent(storage).filter((l) => l !== lang)].slice(0, max);
  try {
    storage?.setItem(RECENT_KEY, JSON.stringify(next));
  } catch {
    return next;
  }
  return next;
}

export function readRecent(storage: Storage | null): string[] {
  try {
    const v = JSON.parse(storage?.getItem(RECENT_KEY) ?? "[]");
    return Array.isArray(v) ? v.filter((x) => typeof x === "string") : [];
  } catch {
    return [];
  }
}

export function pickerGroups(all: readonly string[], mine: readonly string[], recent: readonly string[], query: string, name: (l: string) => string) {
  const q = foldForSearch(query);
  const match = (l: string) => !q || foldForSearch(name(l)).includes(q) || l === q;
  return {
    recent: recent.filter((l) => all.includes(l) && match(l)),
    mine: mine.filter((l) => all.includes(l) && !recent.includes(l) && match(l)),
    more: all.filter((l) => !mine.includes(l) && !recent.includes(l) && match(l)),
  };
}
