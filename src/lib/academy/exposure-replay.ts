import { ADAPTIVE, dayKey, normalizeState, type EngineState } from "./engine";
import { FSRS, type Card } from "./fsrs";
import { gradeCard, parseCardId } from "./lang-systems";
import { isReview, orderRows, type ExposureRow, type LogRow } from "./learn-log";
import { LANG_ATOMS_VERSION } from "./replay";

export const EXPOSURE_ALPHA = 0;

export interface ExposureParams {
  alpha: number;
  resolve: (lang: string, lemma: string) => string | null;
}

const lemmaMaps = new Map<string, ReadonlyMap<string, string>>();

export function registerLemmaMap(lang: string, map: ReadonlyMap<string, string>): void {
  lemmaMaps.set(lang, map);
}

export function resolveLemma(lang: string, lemma: string): string | null {
  return lemmaMaps.get(lang)?.get(lemma.normalize("NFC").toLowerCase()) ?? null;
}

export const DEFAULT_EXPOSURE_PARAMS: ExposureParams = { alpha: EXPOSURE_ALPHA, resolve: resolveLemma };

export type ExposureCard = Card & { exposureDay?: string };

const DAY_MS = 86_400_000;
const fsrs = new FSRS();

export function exposureGainFor(alpha: number): number {
  return Math.min(ADAPTIVE.FIRE_MAX_STABILITY_GAIN, Math.max(0, alpha) * ADAPTIVE.FIRE_MAX_STABILITY_GAIN);
}

export function creditExposure(card: ExposureCard | undefined, at: number, tz: string, alpha: number): ExposureCard | undefined {
  return creditOnDay(card, at, dayKey(at, tz), alpha);
}

export function creditOnDay(card: ExposureCard | undefined, at: number, day: string, alpha: number): ExposureCard | undefined {
  if (!card || card.state === "new" || typeof card.stability !== "number" || card.stability <= 0) return card;
  if (card.exposureDay === day) return card;
  const last = card.lastReview ?? at;
  const R = fsrs.retrievability(Math.max(0, (at - last) / DAY_MS), card.stability);
  if (R < ADAPTIVE.FIRE_MIN_RETRIEVABILITY) return card;
  const s = card.stability * (1 + exposureGainFor(alpha));
  const due = Math.max(card.due ?? 0, last + fsrs.interval(s) * DAY_MS);
  return { ...card, stability: s, due, exposureDay: day };
}

export function tapCard(card: ExposureCard | undefined, at: number): ExposureCard | undefined {
  return card ? { ...card, due: at } : card;
}

function cardIds(row: ExposureRow, lemmas: readonly string[], p: ExposureParams): string[] {
  return Array.from(new Set(lemmas.map((l) => p.resolve(row.lang, l)).filter((id): id is string => !!id)));
}

export function applyExposureGroup(state: EngineState, rows: readonly ExposureRow[], p: ExposureParams = DEFAULT_EXPOSURE_PARAMS): EngineState {
  const out = { ...state, cards: { ...state.cards } };
  for (const r of rows) {
    for (const id of cardIds(r, r.lemmas_seen, p)) {
      if (r.taps.some((t) => p.resolve(r.lang, t) === id)) continue;
      const next = creditExposure(out.cards[id] as ExposureCard | undefined, r.reviewed_at, r.tz, p.alpha);
      if (next) out.cards[id] = next;
    }
  }
  for (const r of rows) {
    for (const id of cardIds(r, r.taps, p)) {
      const next = tapCard(out.cards[id] as ExposureCard | undefined, r.reviewed_at);
      if (next) out.cards[id] = next;
    }
  }
  return out;
}

export function replayLangLog(baseline: EngineState | null, log: readonly LogRow[], p: ExposureParams = DEFAULT_EXPOSURE_PARAMS): EngineState {
  let state = normalizeState(baseline);
  const rows = orderRows(log);
  let i = 0;
  while (i < rows.length) {
    const at = rows[i].reviewed_at;
    let j = i;
    while (j < rows.length && rows[j].reviewed_at === at) j++;
    const group = rows.slice(i, j);
    for (const r of group) {
      if (!isReview(r)) continue;
      if (r.atoms_version !== LANG_ATOMS_VERSION) continue;
      const { lang, itemId } = parseCardId(r.card_id);
      const day = (state.cards[r.card_id] as ExposureCard | undefined)?.exposureDay;
      state = gradeCard(state, lang, itemId, r.rating, r.reviewed_at, r.tz);
      if (day && state.cards[r.card_id]) state.cards[r.card_id] = { ...state.cards[r.card_id], exposureDay: day } as ExposureCard;
    }
    const exposures = group.filter((r): r is ExposureRow => r.kind === "exposure");
    if (exposures.length) state = applyExposureGroup(state, exposures, p);
    i = j;
  }
  return state;
}

export function groupOnDay(card: ExposureCard | undefined, tapped: readonly boolean[], at: number, day: string, alpha: number): ExposureCard | undefined {
  let c = card;
  for (const t of tapped) if (!t) c = creditOnDay(c, at, day, alpha);
  for (const t of tapped) if (t) c = tapCard(c, at);
  return c;
}
