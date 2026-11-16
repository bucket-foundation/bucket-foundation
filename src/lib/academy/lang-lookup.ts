import { langCorpus } from "./groups-server";
import type { LangItem } from "./lang-systems";

export type LangWord = Pick<LangItem, "forms" | "readings" | "gloss">;

let index: Map<string, LangWord[]> | null = null;

export function corpusLookup(lang: string, form: string): LangWord[] {
  if (!index) {
    index = new Map();
    for (const item of langCorpus()?.items ?? []) {
      if (item.kind !== "word") continue;
      for (const [l, f] of Object.entries(item.forms)) {
        const key = `${l}\u0000${f}`;
        const list = index.get(key);
        if (list) list.push(item);
        else index.set(key, [item]);
      }
    }
  }
  return index.get(`${lang}\u0000${form}`) ?? [];
}
