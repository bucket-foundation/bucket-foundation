import { exerciseFor, type LangCorpus, type LangSystem } from "./lang-systems";

export interface ClipText {
  lang: string;
  text: string;
  reading?: string;
}

const NO_RNG = () => 0;

function readingFor(lang: string, r: { kana?: string; roman?: string } | undefined): string | undefined {
  if (lang === "ja") return r?.kana;
  if (lang === "zh") return r?.roman;
  return undefined;
}

export function clipTexts(corpus: LangCorpus): ClipText[] {
  const out = new Map<string, ClipText>();
  const add = (lang: string, text: string | undefined, reading?: string) => {
    if (!text) return;
    const k = `${lang}\u0000${text}`;
    if (!out.has(k) || (reading && !out.get(k)!.reading)) out.set(k, { lang, text, reading });
  };
  for (const item of corpus.items) {
    if (item.kind === "gender") {
      for (const lang of Object.keys(item.gender)) {
        const system: LangSystem = { id: "clips", name: "clips", root: "en", targets: [lang], createdAt: 0, placement: {} };
        const ex = exerciseFor(corpus, system, item, lang, undefined, NO_RNG);
        add(lang, `${ex.answer}${ex.cloze?.after ?? ""}`);
      }
      continue;
    }
    for (const [lang, word] of Object.entries(item.forms)) add(lang, word, readingFor(lang, item.readings[lang]));
    for (const [lang, table] of Object.entries(item.conj)) for (const f of table) add(lang, f);
    for (const [lang, table] of Object.entries(item.conjPast)) for (const f of table) add(lang, f);
  }
  return Array.from(out.values()).sort((a, b) => (a.lang === b.lang ? (a.text < b.text ? -1 : 1) : a.lang < b.lang ? -1 : 1));
}
