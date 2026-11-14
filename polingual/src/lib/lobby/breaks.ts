export const BREAKS_KEY = "polingual-web/ad-breaks/v1";

export interface Breaks {
  games: number;
  lastInterstitial: number | null;
}

interface BreakStore {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

export function readBreaks(store: () => BreakStore | null): Breaks {
  try {
    const raw = store()?.getItem(BREAKS_KEY);
    const v = raw ? JSON.parse(raw) : null;
    return { games: Number.isInteger(v?.games) ? v.games : 0, lastInterstitial: typeof v?.lastInterstitial === "number" ? v.lastInterstitial : null };
  } catch {
    return { games: 0, lastInterstitial: null };
  }
}

export function writeBreaks(store: () => BreakStore | null, next: Breaks): void {
  try {
    store()?.setItem(BREAKS_KEY, JSON.stringify(next));
  } catch {
  }
}
