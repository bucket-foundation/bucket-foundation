import type { EngineState } from "./engine";

export const HITS_TO_HIDE_NAME = 3;

export type FlagRating = 1 | 3 | null;

type Table = "flagHits" | "flagMisses";

function value(state: EngineState, table: Table, lang: string): number {
  return state.settings[table]?.[lang] ?? 0;
}

function setting(state: EngineState, table: Table, lang: string, n: number): EngineState {
  return { ...state, settings: { ...state.settings, [table]: { ...(state.settings[table] ?? {}), [lang]: n } } };
}

export function flagMissCount(state: EngineState, lang: string): number {
  return value(state, "flagMisses", lang);
}

export function flagHits(state: EngineState, lang: string): number {
  return value(state, "flagHits", lang);
}

export function flagShowsName(state: EngineState, lang: string): boolean {
  return flagHits(state, lang) < HITS_TO_HIDE_NAME;
}

export function recordingFlagMiss(state: EngineState, lang: string): EngineState {
  return setting(setting(state, "flagMisses", lang, flagMissCount(state, lang) + 1), "flagHits", lang, 0);
}

export function recordingFlagHit(state: EngineState, lang: string): EngineState {
  return setting(state, "flagHits", lang, flagHits(state, lang) + 1);
}

export function gradeFlagMatch(
  pairs: readonly { lang: string; word: string }[],
  assign: Readonly<Record<string, string>>,
  state: EngineState,
): { ratings: { lang: string; rating: FlagRating }[]; state: EngineState } {
  let next = state;
  const ratings: { lang: string; rating: FlagRating }[] = [];
  for (const p of pairs) {
    const flag = assign[p.lang];
    if (flag === p.lang) {
      ratings.push({ lang: p.lang, rating: 3 });
      next = recordingFlagHit(next, p.lang);
    } else if (flag !== undefined && !flagShowsName(state, flag)) {
      ratings.push({ lang: p.lang, rating: null });
      next = recordingFlagMiss(next, flag);
    } else {
      ratings.push({ lang: p.lang, rating: 1 });
    }
  }
  return { ratings, state: next };
}
