import type { LangItem } from "./lang-systems";
import type { LobbyPromptRow, RevealEntry } from "./lobbies";
import { parseTile } from "./lobby-tiles";

type Word = Pick<LangItem, "forms" | "readings"> & { gloss?: string };
type Lookup = (lang: string, form: string) => readonly Word[];

function roman(item: Word | null | undefined, lang: string): string | null {
  const r = item?.readings?.[lang];
  return r?.roman ?? r?.kana ?? null;
}

const SENSE_LIMIT = 3;

function joined(values: (string | undefined)[]): string {
  return Array.from(new Set(values.filter((v): v is string => !!v))).slice(0, SENSE_LIMIT).join("; ");
}

function foilSenses(lang: string, word: string, root: string, lookup: Lookup, answer: Word | null): readonly Word[] {
  const all = lookup(lang, word);
  if (!answer) return all;
  const apart = all.filter((w) => w !== answer && w.forms[root] !== answer.forms[root]);
  return apart.length ? apart : all;
}

function entry(lang: string, word: string, root: string, lookup: Lookup, correct: boolean, own?: Word | null, answer: Word | null = null): RevealEntry {
  if (own) return { lang, word, roman: roman(own, lang), reading: own.readings?.[lang] ?? null, meaning: own.forms[root] ?? "", gloss: own.gloss ?? "", correct };
  const senses = foilSenses(lang, word, root, lookup, answer);
  const first = senses[0] ?? null;
  const reading = first?.readings?.[lang] ?? null;
  const oneReading = senses.every((w) => JSON.stringify(w.readings?.[lang] ?? null) === JSON.stringify(reading));
  return { lang, word, roman: oneReading ? roman(first, lang) : null, reading: oneReading ? reading : null, meaning: joined(senses.map((w) => w.forms[root])), gloss: joined(senses.map((w) => w.gloss)), correct };
}

export function revealEntries(row: Pick<LobbyPromptRow, "mode" | "lang" | "choices" | "answer">, root: string, item: Word | null, lookup: Lookup): RevealEntry[] {
  if (row.mode === "flag") {
    return row.choices.filter((l) => item?.forms[l]).map((l) => entry(l, item!.forms[l], root, lookup, l === row.answer, item));
  }
  if (row.mode === "tiles") {
    const right = new Set(row.answer.split(",").map(Number));
    return row.choices.map((key, i) => {
      const t = parseTile(key);
      return entry(t.lang, t.form, root, lookup, right.has(i), right.has(i) ? item : null, item);
    });
  }
  if (row.mode === "meaning") {
    return [entry(row.lang, item?.forms[row.lang] ?? row.choices[0], root, lookup, true, item), ...row.choices.filter((c) => c !== row.answer).map((c) => entry(root, c, root, lookup, false, null, item))];
  }
  if (row.mode === "spy") {
    const word = item?.forms[row.lang] ?? row.answer;
    const own = entry(row.lang, word, root, lookup, true, item);
    return item?.forms[root] && root !== row.lang ? [own, entry(root, item.forms[root], root, lookup, false, item)] : [own];
  }
  if (row.mode === "mixed") {
    return row.choices.map((key) => {
      const t = parseTile(key);
      return entry(t.lang, t.form, root, lookup, key === row.answer, key === row.answer ? item : null, item);
    });
  }
  return row.choices.map((c) => entry(row.lang, c, root, lookup, c === row.answer, c === row.answer ? item : null, item));
}
