import type { LangItem } from "./lang-systems";
import type { LobbyPromptRow, RevealEntry } from "./lobbies";
import { parseTile } from "./lobby-tiles";

type Word = Pick<LangItem, "forms" | "readings"> & { gloss?: string };
type Lookup = (lang: string, form: string) => readonly Word[];

function roman(item: Word | null | undefined, lang: string): string | null {
  const r = item?.readings?.[lang];
  return r?.roman ?? r?.kana ?? null;
}

function entry(lang: string, word: string, root: string, lookup: Lookup, correct: boolean, own?: Word | null): RevealEntry {
  const item = own ?? lookup(lang, word)[0] ?? null;
  return { lang, word, roman: roman(item, lang), reading: item?.readings?.[lang] ?? null, meaning: item?.forms[root] ?? "", gloss: item?.gloss ?? "", correct };
}

export function revealEntries(row: Pick<LobbyPromptRow, "mode" | "lang" | "choices" | "answer">, root: string, item: Word | null, lookup: Lookup): RevealEntry[] {
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
  if (row.mode === "meaning") {
    return [entry(row.lang, item?.forms[row.lang] ?? row.choices[0], root, lookup, true, item), ...row.choices.filter((c) => c !== row.answer).map((c) => entry(root, c, root, lookup, false))];
  }
  if (row.mode === "mixed") {
    return row.choices.map((key) => {
      const t = parseTile(key);
      return entry(t.lang, t.form, root, lookup, key === row.answer, key === row.answer ? item : null);
    });
  }
  return row.choices.map((c) => entry(row.lang, c, root, lookup, c === row.answer, c === row.answer ? item : null));
}
