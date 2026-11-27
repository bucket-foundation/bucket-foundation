export type AgeBand = "under13" | "teen" | "adult";
export type SpeakLevel = 1 | 2 | 3 | 4;
export type CheckBand = "pre-A1" | "A1" | "A2" | "B1" | "B2";

export interface Spoken {
  lang: string;
  level: SpeakLevel;
  reads?: boolean;
}

export interface PlayerCard {
  band: AgeBand;
  nickname: string;
  speaks: Spoken[];
  learn: string[];
  surprise: boolean;
  check: Record<string, CheckBand>;
}

export const AGE_BANDS: { band: AgeBand; label: string }[] = [
  { band: "under13", label: "Under 13" },
  { band: "teen", label: "13 to 17" },
  { band: "adult", label: "18 and over" },
];

export const LEVELS: { level: SpeakLevel; face: string; label: string }[] = [
  { level: 1, face: "🙂", label: "A few words" },
  { level: 2, face: "😀", label: "I get by" },
  { level: 3, face: "😎", label: "Fluent" },
  { level: 4, face: "🏠", label: "Home language" },
];

export const MAX_LEARN = 3;
export const MAX_SPEAK = 6;
const CARD_KEY = "polingual-web/player-card/v1";
const LANG_RE = /^[a-z]{2,3}(-[A-Za-z0-9]{2,8})?$/;
const BANDS: CheckBand[] = ["pre-A1", "A1", "A2", "B1", "B2"];

export function blankCard(nickname = ""): PlayerCard {
  return { band: "adult", nickname, speaks: [], learn: [], surprise: false, check: {} };
}

export function keepsData(band: AgeBand): boolean {
  return band !== "under13";
}

export function toggleSpeak(card: PlayerCard, lang: string): PlayerCard {
  if (card.speaks.some((s) => s.lang === lang)) return { ...card, speaks: card.speaks.filter((s) => s.lang !== lang) };
  if (card.speaks.length >= MAX_SPEAK) return card;
  return { ...card, speaks: [...card.speaks, { lang, level: 2 }], learn: card.learn.filter((l) => l !== lang) };
}

export function setLevel(card: PlayerCard, lang: string, level: SpeakLevel): PlayerCard {
  return { ...card, speaks: card.speaks.map((s) => (s.lang === lang ? (level === 4 ? { lang, level, reads: s.reads ?? true } : { lang, level }) : s)) };
}

export function setReads(card: PlayerCard, lang: string, reads: boolean): PlayerCard {
  return { ...card, speaks: card.speaks.map((s) => (s.lang === lang && s.level === 4 ? { ...s, reads } : s)) };
}

export function toggleLearn(card: PlayerCard, lang: string): PlayerCard {
  if (card.learn.includes(lang)) return { ...card, learn: card.learn.filter((l) => l !== lang) };
  if (card.learn.length >= MAX_LEARN || card.speaks.some((s) => s.lang === lang)) return card;
  return { ...card, learn: [...card.learn, lang], surprise: false };
}

export function setSurprise(card: PlayerCard, on: boolean): PlayerCard {
  return { ...card, surprise: on, learn: on ? [] : card.learn };
}

export function cardReady(card: PlayerCard): boolean {
  return card.nickname.length >= 2 && card.speaks.length > 0 && (card.surprise || card.learn.length > 0);
}

function lang(v: unknown): string | null {
  return typeof v === "string" && LANG_RE.test(v) ? v : null;
}

export function normalizeCard(raw: unknown): PlayerCard | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  const band = AGE_BANDS.find((b) => b.band === r.band)?.band;
  if (!band) return null;
  const nickname = typeof r.nickname === "string" ? r.nickname.replace(/\s+/g, " ").trim().slice(0, 24) : "";
  const seen = new Set<string>();
  const speaks: Spoken[] = [];
  for (const s of Array.isArray(r.speaks) ? r.speaks : []) {
    const l = lang((s as Spoken)?.lang);
    const level = (s as Spoken)?.level;
    if (!l || seen.has(l) || ![1, 2, 3, 4].includes(level as number)) continue;
    seen.add(l);
    speaks.push(level === 4 ? { lang: l, level: 4, reads: (s as Spoken).reads !== false } : { lang: l, level: level as SpeakLevel });
    if (speaks.length >= MAX_SPEAK) break;
  }
  const learn = Array.from(new Set((Array.isArray(r.learn) ? r.learn : []).map(lang).filter((l): l is string => !!l && !seen.has(l)))).slice(0, MAX_LEARN);
  const check: Record<string, CheckBand> = {};
  if (r.check && typeof r.check === "object") {
    for (const [k, v] of Object.entries(r.check as Record<string, unknown>)) if (lang(k) && BANDS.includes(v as CheckBand)) check[k] = v as CheckBand;
  }
  return { band, nickname, speaks, learn, surprise: r.surprise === true && learn.length === 0, check };
}

type Store = Pick<Storage, "getItem" | "setItem" | "removeItem">;

export function readCard(store: Store | null): PlayerCard | null {
  try {
    const raw = store?.getItem(CARD_KEY);
    const card = raw ? normalizeCard(JSON.parse(raw)) : null;
    return card && keepsData(card.band) ? card : null;
  } catch {
    return null;
  }
}

export function writeCard(store: Store | null, card: PlayerCard): void {
  try {
    if (!keepsData(card.band)) store?.removeItem(CARD_KEY);
    else store?.setItem(CARD_KEY, JSON.stringify(card));
  } catch {
    return;
  }
}

export function surprisePick(card: PlayerCard, pool: readonly string[], random: () => number): string[] {
  if (!card.surprise) return card.learn;
  const open = pool.filter((l) => !card.speaks.some((s) => s.lang === l));
  return open.length ? [open[Math.floor(random() * open.length)]] : [];
}

export function bandFromAnswers(answers: readonly boolean[]): CheckBand {
  let n = 0;
  while (n < answers.length && n < 4 && answers[n]) n++;
  return BANDS[n];
}
