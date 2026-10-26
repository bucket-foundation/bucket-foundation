import type { EngineState } from "./engine";
import { cardId, langName, type LangCorpus, type LangSystem } from "./lang-systems";

export interface Milestone {
  id: string;
  title: string;
  items: string[];
}

const ONE_TO_TEN = ["one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten"];

export const MILESTONES: Milestone[] = [
  { id: "hello", title: "Hello in every language", items: ["ph-hello"] },
  { id: "count-10", title: "Count to 10", items: ONE_TO_TEN },
  { id: "count-100", title: "Count to 10, then 100", items: [...ONE_TO_TEN, "hundred"] },
  { id: "order-food", title: "Order food", items: ["ph-menu-please", "ph-i-would-like", "ph-water-please", "ph-the-check-please"] },
  { id: "introduce", title: "Introduce yourself", items: ["ph-my-name-is", "ph-nice-to-meet-you", "ph-where-are-you-from", "ph-i-am-from"] },
  { id: "first-sentence", title: "A first sentence", items: ["ph-how-are-you", "ph-i-am-fine", "ph-and-you"] },
];

export interface MilestoneLang {
  lang: string;
  name: string;
  words: { gloss: string; form: string }[];
  learned: number;
  done: boolean;
}

export interface MilestoneProgress {
  milestone: Milestone;
  langs: MilestoneLang[];
  learned: number;
  total: number;
  earned: boolean;
}

export function milestoneProgress(m: Milestone, system: LangSystem, corpus: LangCorpus, state: EngineState): MilestoneProgress {
  const items = m.items.map((id) => corpus.byId.get(id)).filter((i): i is NonNullable<typeof i> => Boolean(i));
  const complete = items.length === m.items.length;
  const langs: MilestoneLang[] = [];
  for (const lang of system.targets) {
    if (!complete || !items.every((i) => i.forms[lang])) continue;
    const learned = items.filter((i) => state.cards[cardId(lang, i.id)]).length;
    langs.push({ lang, name: langName(lang), words: items.map((i) => ({ gloss: i.gloss, form: i.forms[lang] })), learned, done: learned === items.length });
  }
  const learned = langs.reduce((n, l) => n + l.learned, 0);
  const total = langs.length * items.length;
  return { milestone: m, langs, learned, total, earned: langs.length > 0 && langs.every((l) => l.done) };
}

export function allMilestones(system: LangSystem, corpus: LangCorpus, state: EngineState): MilestoneProgress[] {
  return MILESTONES.map((m) => milestoneProgress(m, system, corpus, state)).filter((p) => p.langs.length > 0);
}

export interface CardLine {
  lang: string;
  text: string;
}

export function shareLines(p: MilestoneProgress, maxWords = 11): CardLine[] {
  return p.langs.map((l) => ({ lang: l.name, text: l.words.slice(0, maxWords).map((w) => w.form).join(p.milestone.id.startsWith("count") ? " · " : " / ") }));
}

export function shareText(p: MilestoneProgress): string {
  return `${p.milestone.title}: ${p.langs.map((l) => l.name).join(", ")}. Learned with Bucket.`;
}
