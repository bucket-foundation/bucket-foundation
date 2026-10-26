import { distractors, shuffle, type Exercise, type LangCorpus, type LangItem, type LangSystem, type Reading, type Rng } from "./lang-systems";

export const LINKS_CAP = 3;
export const ROOT_TO_TARGET_SHARE = 1 / 3;

export interface LinkForm {
  lang: string;
  word: string;
  why: "known" | "cognate" | "root";
  reading?: Reading;
}

const byCode = (a: string, b: string) => (a < b ? -1 : a > b ? 1 : 0);

export function linkForms(item: LangItem, system: LangSystem, lang: string, cap = LINKS_CAP): LinkForm[] {
  const out: LinkForm[] = [];
  const seen = new Set([lang]);
  const add = (l: string, why: LinkForm["why"]) => {
    if (out.length >= cap || seen.has(l) || !item.forms[l]) return;
    seen.add(l);
    out.push({ lang: l, word: item.forms[l], why, reading: item.readings[l] });
  };
  for (const l of system.targets.filter((x) => x !== system.root).sort(byCode)) add(l, "known");
  for (const l of [...item.cognateLangs].sort(byCode)) if (l !== system.root) add(l, "cognate");
  add(system.root, "root");
  return out;
}

const ROOT_TO_TARGET = new Set<Exercise["kind"]>(["choose", "cognate"]);

export function isRootToTarget(ex: Exercise): boolean {
  return ROOT_TO_TARGET.has(ex.kind) && ex.promptLang === ex.root && ex.answerLang === ex.lang;
}

export function targetFirst(corpus: LangCorpus, item: LangItem, ex: Exercise, rng: Rng): Exercise {
  if (!isRootToTarget(ex) || rng() < ROOT_TO_TARGET_SHARE) return ex;
  const target = item.forms[ex.lang];
  const rootWord = item.forms[ex.root];
  if (!target || !rootWord) return ex;
  return {
    itemId: ex.itemId,
    lang: ex.lang,
    root: ex.root,
    note: ex.note,
    kind: "reverse",
    prompt: target,
    promptLang: ex.lang,
    answer: rootWord,
    answerLang: ex.root,
    promptReading: ex.answerReading,
    answerReading: ex.promptReading,
    options: shuffle([rootWord, ...distractors(corpus, item, ex.root, ex.lang, rng)], rng),
  };
}
