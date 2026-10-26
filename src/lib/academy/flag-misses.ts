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

export type FlagTables = Pick<EngineState["settings"], "flagHits" | "flagMisses">;

export function flagTables(state: EngineState): FlagTables {
  return { flagHits: { ...(state.settings.flagHits ?? {}) }, flagMisses: { ...(state.settings.flagMisses ?? {}) } };
}

export function withFlagTables(state: EngineState, tables: FlagTables): EngineState {
  return { ...state, settings: { ...state.settings, ...tables } };
}

export function mergeFlagTables(a: FlagTables, b: FlagTables): FlagTables {
  const hits: Record<string, number> = {};
  const misses: Record<string, number> = {};
  const langs = Array.from(new Set([a.flagHits, b.flagHits, a.flagMisses, b.flagMisses].flatMap((t) => Object.keys(t ?? {}))));
  for (const lang of langs) {
    const ma = a.flagMisses?.[lang] ?? 0;
    const mb = b.flagMisses?.[lang] ?? 0;
    const ha = a.flagHits?.[lang] ?? 0;
    const hb = b.flagHits?.[lang] ?? 0;
    const [m, h] = ma > mb ? [ma, ha] : mb > ma ? [mb, hb] : [ma, Math.max(ha, hb)];
    if (lang in (a.flagHits ?? {}) || lang in (b.flagHits ?? {}) || m > 0) hits[lang] = h;
    if (lang in (a.flagMisses ?? {}) || lang in (b.flagMisses ?? {})) misses[lang] = m;
  }
  const out: FlagTables = {};
  if (a.flagHits || b.flagHits) out.flagHits = hits;
  if (a.flagMisses || b.flagMisses) out.flagMisses = misses;
  return out;
}
