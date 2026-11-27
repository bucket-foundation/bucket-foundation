export const FAMILY_WINDOW_CAP_S = 45;
export const MAX_TIME_FACTOR = 3;
export const FAIR_BASE = 100;
export const FAIR_SPEED = 100;
export const LADDER_TOP = 5;
export const LADDER_BOTTOM = -1;
const CHECK_LEVEL: Record<string, number> = { "pre-A1": 0, A1: 0, A2: 1, B1: 2, B2: 3 };

export type Band = "under13" | "teen" | "adult";

export interface FairCard {
  band: Band;
  speaks: { lang: string; level: 1 | 2 | 3 | 4; reads?: boolean }[];
  learn: string[];
  check?: Record<string, string>;
}

export function timeFactor(card: Pick<FairCard, "band"> | null, firstRoundMs: number | null = null, roundSeconds = 20): number {
  const age = card?.band === "under13" ? 2 : card?.band === "teen" ? 1.25 : 1;
  const slow = firstRoundMs !== null && firstRoundMs > roundSeconds * 800 ? 1.5 : 1;
  return Math.min(MAX_TIME_FACTOR, age * slow);
}

export function seatBand(card: Pick<FairCard, "band"> | null): Band {
  return card?.band ?? "adult";
}

export function timingBand(cardBand: Band | null | undefined, seat: Band | null | undefined): Band {
  return cardBand ?? seat ?? "adult";
}

export function windowSeconds(roundSeconds: number, factor: number): number {
  return Math.min(FAMILY_WINDOW_CAP_S, roundSeconds * Math.max(1, Math.min(MAX_TIME_FACTOR, factor)));
}

export function cardLevel(card: FairCard | null, lang: string): number {
  if (!card) return 0;
  const spoken = card.speaks.find((s) => s.lang === lang);
  if (spoken) return spoken.level - 1;
  return CHECK_LEVEL[card.check?.[lang] ?? ""] ?? 0;
}

export function ladderLevel(start: number, answers: readonly boolean[]): number {
  return answers.reduce((level, right) => clamp(level + (right ? 1 : -1)), clamp(start));
}

function clamp(n: number): number {
  return Math.max(LADDER_BOTTOM, Math.min(LADDER_TOP, n));
}

export const WARM_UP_ROUNDS = 1;

export function fairPoints(correct: boolean, ms: number, windowS: number, round = WARM_UP_ROUNDS): number {
  if (!correct) return 0;
  if (round < WARM_UP_ROUNDS) return FAIR_BASE;
  const left = Math.max(0, Math.min(1, 1 - ms / (windowS * 1000)));
  return FAIR_BASE + Math.round(FAIR_SPEED * left);
}

export type Side = "learn" | "known";

export function promptSide(card: FairCard | null, wordLang: string): { side: Side; answerLang: string | null } {
  const spoken = card?.speaks.find((s) => s.lang === wordLang);
  if (spoken && spoken.level >= 3) return { side: "learn", answerLang: card?.learn[0] ?? null };
  const known = card?.speaks.slice().sort((a, b) => b.level - a.level)[0]?.lang ?? null;
  return { side: "known", answerLang: known };
}

export interface RoundAnswer {
  round: number;
  userId: string;
  correct: boolean;
}

export function teacherAwards(promptLangs: ReadonlyMap<number, string>, answers: readonly RoundAnswer[], homeSpeakers: ReadonlyMap<string, string[]>): Map<string, number> {
  const out = new Map<string, number>();
  for (const [round, lang] of Array.from(promptLangs.entries())) {
    const teachers = homeSpeakers.get(lang) ?? [];
    if (!teachers.length) continue;
    const learners = answers.filter((a) => a.round === round && !teachers.includes(a.userId));
    if (!learners.length || learners.filter((a) => a.correct).length * 2 <= learners.length) continue;
    const teacher = teachers.slice().sort()[round % teachers.length];
    out.set(teacher, (out.get(teacher) ?? 0) + 1);
  }
  return out;
}

export function homeSpeakersOf(cards: readonly { userId: string; card: Pick<FairCard, "speaks"> }[]): Map<string, string[]> {
  const out = new Map<string, string[]>();
  for (const c of cards) for (const s of c.card.speaks) if (s.level === 4) out.set(s.lang, [...(out.get(s.lang) ?? []), c.userId]);
  return out;
}
