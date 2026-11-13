import { MAX_GUESSES } from "./puzzle";

export const PROGRESS_KEY = "polingual-web/polyword/v1";

export interface Game {
  guesses: string[];
  done: boolean;
  won: boolean;
  archive?: boolean;
}

export interface Progress {
  v: 1;
  lang?: string;
  games: Record<string, Record<string, Game>>;
  unlocked: Record<string, number[]>;
  first?: string;
}

export function emptyProgress(): Progress {
  return { v: 1, games: {}, unlocked: {} };
}

export function parseProgress(raw: string | null): Progress {
  if (!raw) return emptyProgress();
  try {
    const p = JSON.parse(raw) as Partial<Progress>;
    if (p?.v !== 1 || typeof p.games !== "object" || p.games === null) return emptyProgress();
    const out: Progress = { v: 1, games: p.games, unlocked: typeof p.unlocked === "object" && p.unlocked ? p.unlocked : {} };
    if (typeof p.lang === "string") out.lang = p.lang;
    if (typeof p.first === "string") out.first = p.first;
    return out;
  } catch {
    return emptyProgress();
  }
}

export function gameKey(lang: string, day: number): string {
  return `${lang}:${day}`;
}

export function gameOf(p: Progress, lang: string, day: number): Game | undefined {
  return p.games[lang]?.[String(day)];
}

export function withGame(p: Progress, lang: string, day: number, game: Game): Progress {
  const games = { ...p.games, [lang]: { ...(p.games[lang] ?? {}), [String(day)]: game } };
  const first = p.first ?? (game.done ? gameKey(lang, day) : undefined);
  return first ? { ...p, games, first } : { ...p, games };
}

export function withUnlock(p: Progress, lang: string, day: number): Progress {
  const have = p.unlocked[lang] ?? [];
  if (have.includes(day)) return p;
  return { ...p, unlocked: { ...p.unlocked, [lang]: [...have, day] } };
}

export function isUnlocked(p: Progress, lang: string, day: number, today: number, pro: boolean): boolean {
  if (day === today) return true;
  if (day < 1 || day > today) return false;
  return pro || (p.unlocked[lang] ?? []).includes(day) || !!gameOf(p, lang, day);
}

export function firstGame(p: Progress, lang: string, day: number): boolean {
  return p.first === undefined || p.first === gameKey(lang, day);
}

export interface Stats {
  played: number;
  won: number;
  streak: number;
  best: number;
  dist: number[];
}

export function statsFor(p: Progress, lang: string, today: number): Stats {
  const games = p.games[lang] ?? {};
  const daily = Object.entries(games)
    .filter(([, g]) => g.done && !g.archive)
    .map(([d, g]) => ({ day: Number(d), g }));
  const dist = Array.from({ length: MAX_GUESSES }, () => 0);
  let won = 0;
  for (const { g } of daily) {
    if (!g.won) continue;
    won++;
    dist[Math.min(g.guesses.length, MAX_GUESSES) - 1]++;
  }
  const wins = new Set(daily.filter(({ g }) => g.won).map(({ day }) => day));
  let best = 0;
  let run = 0;
  for (const day of [...wins].sort((a, b) => a - b)) {
    run = wins.has(day - 1) ? run + 1 : 1;
    best = Math.max(best, run);
  }
  let streak = 0;
  let cursor = wins.has(today) ? today : games[String(today)]?.done ? 0 : today - 1;
  while (cursor > 0 && wins.has(cursor)) {
    streak++;
    cursor--;
  }
  return { played: daily.length, won, streak, best, dist };
}
