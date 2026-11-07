import { LANGS, WORDS, type Word } from "../words";
import { PER_ROUND, ROUNDS, type LiveQuestion, type QuestionKind, type RoomSettings } from "./questions";

export const ROUND_TIERS: [number, number][] = [[0, 3], [3, 6], [6, 10]];
export const FAMILY_SHARE = 0.4;
export const MAX_WIDEN = 2;

export const FAMILIES: Record<string, string> = {
  es: "romance", fr: "romance", it: "romance", pt: "romance",
  en: "germanic", de: "germanic", nl: "germanic", sv: "germanic",
  ru: "slavic", pl: "slavic", cs: "slavic",
  ar: "semitic", he: "semitic",
  hi: "indic", fa: "indic", ta: "indic",
  ja: "east_asian", zh: "east_asian", ko: "east_asian", th: "east_asian", vi: "east_asian",
  la: "classical", grc: "classical", sa: "classical", ang: "classical",
  el: "hellenic", fi: "uralic", tr: "turkic", id: "austronesian",
};

export type Rng = () => number;

export function seeded(seed: number): Rng {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function shuffle<T>(items: readonly T[], rng: Rng): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

function form(w: Word, lang: string): string | null {
  return w.forms.find((f) => f.lang === lang)?.word ?? null;
}

export function fold(text: string): string {
  return text.normalize("NFKC").toLocaleLowerCase("und").trim();
}

export function leaks(prompt: Record<string, string | number>, options: string[]): boolean {
  const opts = new Set(options.map(fold));
  return Object.values(prompt).some((v) => typeof v === "string" && opts.has(fold(v)));
}

export function familyCap(targets: string[], slots: number): number {
  const families = new Set(targets.map((t) => FAMILIES[t] ?? t)).size;
  if (families <= 1) return slots;
  return Math.max(Math.ceil(FAMILY_SHARE * slots), Math.ceil(slots / families));
}

export function roundTargets(targets: string[], slots: number, rng: Rng): string[] {
  const cap = familyCap(targets, slots);
  const used = new Map<string, number>();
  const out: string[] = [];
  const family = (t: string) => FAMILIES[t] ?? t;
  const open = (t: string) => (used.get(family(t)) ?? 0) < cap;
  let order: string[] = [];
  while (out.length < slots) {
    if (!order.some(open)) order = shuffle(targets.filter(open), rng);
    const t = order.splice(order.findIndex(open), 1)[0];
    used.set(family(t), (used.get(family(t)) ?? 0) + 1);
    out.push(t);
  }
  return out;
}

function inTiers(w: Word, [lo, hi]: [number, number], widen: number): boolean {
  return w.tier >= lo - widen && w.tier <= hi + widen;
}

export function pickTheWord(w: Word, target: string, settings: RoomSettings, words: readonly Word[], rng: Rng): Omit<LiveQuestion, "idx" | "round"> | null {
  const right = form(w, target);
  if (!right) return null;
  const seen = new Set([right]);
  const distractors: string[] = [];
  for (const d of shuffle(words.filter((x) => x.slug !== w.slug && x.category === w.category && Math.abs(x.tier - w.tier) <= 2), rng)) {
    const f = form(d, target);
    if (!f || seen.has(f)) continue;
    seen.add(f);
    distractors.push(f);
    if (distractors.length === 3) break;
  }
  if (distractors.length < 3) return null;
  const home = form(w, settings.home);
  if (!home) return null;
  const options = shuffle([right, ...distractors], rng);
  const prompt = { home, home_lang: settings.home, lang: target };
  if (leaks(prompt, options) || new Set(options.map(fold)).size < 4) return null;
  return { kind: "pick_word", prompt, options, answer: options.indexOf(right) };
}

export function whichLanguage(w: Word, target: string, rng: Rng): Omit<LiveQuestion, "idx" | "round"> | null {
  const word = form(w, target);
  if (!word || !LANGS[target]) return null;
  const script = LANGS[target].script;
  const eligible = Object.keys(LANGS).filter((l) => l !== target && form(w, l) !== word);
  const same = shuffle(eligible.filter((l) => LANGS[l].script === script), rng);
  const rest = shuffle(eligible.filter((l) => LANGS[l].script !== script), rng);
  const distractors = [...same, ...rest].slice(0, 3);
  if (distractors.length < 3) return null;
  const options = shuffle([target, ...distractors], rng);
  const prompt = { word };
  if (leaks(prompt, [...options, ...options.map((l) => LANGS[l].name)])) return null;
  return { kind: "which_language", prompt, options, answer: options.indexOf(target) };
}

export function translate(w: Word, from: string, to: string, words: readonly Word[], rng: Rng): Omit<LiveQuestion, "idx" | "round"> | null {
  const word = form(w, from);
  const right = form(w, to);
  if (!word || !right || from === to) return null;
  const seen = new Set([fold(right)]);
  const distractors: string[] = [];
  for (const d of shuffle(words.filter((x) => x.slug !== w.slug && x.category === w.category && Math.abs(x.tier - w.tier) <= 2), rng)) {
    const f = form(d, to);
    if (!f || seen.has(fold(f))) continue;
    seen.add(fold(f));
    distractors.push(f);
    if (distractors.length === 3) break;
  }
  if (distractors.length < 3) return null;
  const options = shuffle([right, ...distractors], rng);
  const prompt = { word, from, to };
  if (leaks(prompt, options)) return null;
  return { kind: "translate", prompt, options, answer: options.indexOf(right) };
}

export function translateInto(from: string, settings: RoomSettings, rng: Rng): string {
  const others = settings.targets.filter((t) => t !== from);
  return others.length ? others[Math.floor(rng() * others.length)] : settings.home;
}

export function roundKinds(rng: Rng): QuestionKind[] {
  return shuffle<QuestionKind>(["pick_word", "pick_word", "translate", "which_language", "which_language"], rng);
}

export function buildRoomSet(seed: number, settings: RoomSettings, words: readonly Word[] = WORDS): LiveQuestion[] | null {
  const rng = seeded(seed);
  const out: LiveQuestion[] = [];
  const used = new Set<string>();
  for (let round = 1 as 1 | 2 | 3; round <= ROUNDS; round = (round + 1) as 1 | 2 | 3) {
    const targets = roundTargets(settings.targets, PER_ROUND, rng);
    const kinds = roundKinds(rng);
    for (let slot = 0; slot < PER_ROUND; slot++) {
      const into = kinds[slot] === "translate" ? translateInto(targets[slot], settings, rng) : "";
      let q: Omit<LiveQuestion, "idx" | "round"> | null = null;
      for (let widen = 0; widen <= MAX_WIDEN && !q; widen++) {
        for (const w of shuffle(words.filter((x) => !used.has(x.slug) && inTiers(x, ROUND_TIERS[round - 1], widen)), rng)) {
          q =
            kinds[slot] === "pick_word"
              ? pickTheWord(w, targets[slot], settings, words, rng)
              : kinds[slot] === "translate"
                ? translate(w, targets[slot], into, words, rng)
                : whichLanguage(w, targets[slot], rng);
          if (q) {
            used.add(w.slug);
            break;
          }
        }
      }
      if (!q) return null;
      out.push({ idx: out.length, round, ...q });
    }
  }
  return out;
}
