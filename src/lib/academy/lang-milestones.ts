import type { EngineState } from "./engine";
import { cardId, langDir, langName, type LangCard, type LangCorpus, type LangSystem } from "./lang-systems";

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
  words: { gloss: string; form: string | null }[];
  learned: number;
  done: boolean;
  missing: string[];
}

export function completed(card: LangCard | undefined): boolean {
  return Boolean(card && !card.placed && (card.reps ?? 0) >= 1 && card.state !== "new");
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
  const cards = state.cards as Record<string, LangCard>;
  const langs: MilestoneLang[] = system.targets.map((lang) => {
    const missing = items.filter((i) => !i.forms[lang]).map((i) => i.gloss);
    const learned = missing.length ? 0 : items.filter((i) => completed(cards[cardId(lang, i.id)])).length;
    return { lang, name: langName(lang), words: items.map((i) => ({ gloss: i.gloss, form: i.forms[lang] || null })), learned, done: missing.length === 0 && learned === items.length, missing };
  });
  const able = items.length === m.items.length ? langs.filter((l) => l.missing.length === 0) : [];
  const learned = able.reduce((n, l) => n + l.learned, 0);
  const total = able.length * items.length;
  return { milestone: m, langs, learned, total, earned: able.length > 0 && able.every((l) => l.done) };
}

export function allMilestones(system: LangSystem, corpus: LangCorpus, state: EngineState): MilestoneProgress[] {
  return MILESTONES.map((m) => milestoneProgress(m, system, corpus, state)).filter((p) => p.total > 0);
}

export interface CardLine {
  lang: string;
  code: string;
  text: string;
  rtl: boolean;
}

export function shareLines(p: MilestoneProgress, maxWords = 11): CardLine[] {
  return p.langs.filter((l) => l.done).map((l) => ({ lang: l.name, code: l.lang, rtl: langDir(l.lang) === "rtl", text: l.words.slice(0, maxWords).map((w) => w.form).join(p.milestone.id.startsWith("count") ? " · " : " / ") }));
}

export function shareText(p: MilestoneProgress): string {
  return `${p.milestone.title}: ${p.langs.filter((l) => l.done).map((l) => l.name).join(", ")}. Learned with Bucket.`;
}
