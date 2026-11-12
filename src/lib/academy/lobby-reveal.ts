import type { LangItem } from "./lang-systems";
import type { LobbyPromptRow, RevealEntry } from "./lobbies";
import { parseTile } from "./lobby-tiles";

type Lookup = (lang: string, form: string) => readonly Pick<LangItem, "forms" | "readings">[];

function roman(item: Pick<LangItem, "readings"> | null | undefined, lang: string): string | null {
  const r = item?.readings?.[lang];
  return r?.roman ?? r?.kana ?? null;
}

function entry(lang: string, word: string, root: string, lookup: Lookup, correct: boolean, own?: Pick<LangItem, "forms" | "readings"> | null): RevealEntry {
  const item = own ?? lookup(lang, word)[0] ?? null;
  return { lang, word, roman: roman(item, lang), meaning: item?.forms[root] ?? "", correct };
}

export function revealEntries(row: Pick<LobbyPromptRow, "mode" | "lang" | "choices" | "answer">, root: string, item: Pick<LangItem, "forms" | "readings"> | null, lookup: Lookup): RevealEntry[] {
  if (row.mode === "flag") {
    return row.choices.filter((l) => item?.forms[l]).map((l) => entry(l, item!.forms[l], root, lookup, l === row.answer, item));
  }
  if (row.mode === "tiles") {
    const right = new Set(row.answer.split(",").map(Number));
    return row.choices.map((key, i) => {
      const t = parseTile(key);
      return entry(t.lang, t.form, root, lookup, right.has(i), right.has(i) ? item : null);
    });
  }
  return row.choices.map((c) => entry(row.lang, c, root, lookup, c === row.answer, c === row.answer ? item : null));
}
