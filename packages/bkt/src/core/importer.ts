import { mergeState, normalizeState, type EngineState } from "../../../../src/lib/academy/engine";
import { webBranches } from "../local";
import type { PackDeck } from "../pack/export";
import type { Store } from "../store";

export const ALREADY_IMPORTED = "already imported";

export type ImportOutcome = { ok: true; imported: string[] } | { ok: false; status: number; error: string };

export function importProgress(store: Store, decks: Pick<PackDeck, "id">[], payload: unknown, force: boolean, now: number): ImportOutcome {
  if (store.meta("web_import_at") && !force) return { ok: false, status: 409, error: ALREADY_IMPORTED };
  const b = payload && typeof payload === "object" && !Array.isArray(payload) ? (payload as Record<string, unknown>) : null;
  const incoming = b ? webBranches(b) : null;
  if (!incoming) return { ok: false, status: 400, error: "expected { branches: { <deck>: EngineState } }" };
  const known = new Set(decks.map((d) => d.id));
  const unknown = Object.keys(incoming).filter((d) => !known.has(d));
  if (unknown.length) return { ok: false, status: 400, error: `unknown decks: ${unknown.sort().join(", ")}` };
  const imported: string[] = [];
  store.db.transaction(() => {
    for (const [deck, state] of Object.entries(incoming)) {
      store.putLearnState(deck, mergeState(store.learnState(deck), state), now);
      imported.push(deck);
    }
    store.setMeta("web_import_at", String(now));
  })();
  return { ok: true, imported: imported.sort() };
}

export const CARD_STATES = ["new", "learning", "review", "relearning"] as const;
export const SETTINGS_KEYS = ["newPerDay", "requestRetention"] as const;
export const CARD_ID = /^[A-Za-z0-9][A-Za-z0-9._:/-]{0,127}$/;
const DAY = /^\d{4}-\d{1,2}-\d{1,2}$/;
const MAX_TIME = 8_640_000_000_000_000;

type Obj = Record<string, unknown>;
const isObj = (v: unknown): v is Obj => !!v && typeof v === "object" && !Array.isArray(v);
const num = (v: unknown, lo: number, hi: number) => typeof v === "number" && Number.isFinite(v) && v >= lo && v <= hi;
const whole = (v: unknown, hi = 1e9) => Number.isInteger(v) && num(v, 0, hi);
const opt = (v: unknown, ok: (x: unknown) => boolean) => v === undefined || ok(v);
const optNull = (v: unknown, ok: (x: unknown) => boolean) => v === undefined || v === null || ok(v);

const CARD_FIELDS: Record<string, (v: unknown) => boolean> = {
  state: (v) => opt(v, (x) => (CARD_STATES as readonly unknown[]).includes(x)),
  stability: (v) => optNull(v, (x) => num(x, 0, 1e6)),
  difficulty: (v) => optNull(v, (x) => num(x, 1, 10)),
  due: (v) => optNull(v, (x) => num(x, 0, MAX_TIME)),
  lastReview: (v) => optNull(v, (x) => num(x, 0, MAX_TIME)),
  reps: (v) => opt(v, (x) => whole(x)),
  lapses: (v) => opt(v, (x) => whole(x)),
  scheduledDays: (v) => opt(v, (x) => num(x, 0, 36500)),
  firedCredit: (v) => opt(v, (x) => num(x, 0, 1)),
};

export function validCard(c: unknown): boolean {
  return isObj(c) && Object.entries(c).every(([k, v]) => CARD_FIELDS[k]?.(v) === true);
}

const validProf = (p: unknown) => isObj(p) && Object.entries(p).every(([k, v]) => (k === "theta" ? num(v, -100, 100) : k === "n" ? whole(v) : false));

const SETTINGS_CHECK: Record<(typeof SETTINGS_KEYS)[number], (v: unknown) => boolean> = {
  newPerDay: (v) => whole(v, 1000),
  requestRetention: (v) => num(v, 0.5, 0.99),
};

export function checkState(raw: unknown): EngineState | null {
  if (!isObj(raw)) return null;
  const { cards = {}, prof = {}, settings = {}, stats = {} } = raw;
  if (!isObj(cards) || !isObj(prof) || !isObj(settings) || !isObj(stats)) return null;
  for (const [id, c] of Object.entries(cards)) if (!CARD_ID.test(id) || !validCard(c)) return null;
  for (const [id, p] of Object.entries(prof)) if (!CARD_ID.test(id) || !validProf(p)) return null;
  const kept: Obj = {};
  for (const k of SETTINGS_KEYS) {
    if (settings[k] === undefined) continue;
    if (!SETTINGS_CHECK[k](settings[k])) return null;
    kept[k] = settings[k];
  }
  const { xp, streak, lastStudyDay, history = {} } = stats;
  if (!opt(xp, (x) => num(x, 0, 1e12)) || !opt(streak, (x) => whole(x, 1e6)) || !optNull(lastStudyDay, (x) => typeof x === "string" && DAY.test(x)) || !isObj(history)) return null;
  for (const [d, h] of Object.entries(history)) {
    if (!DAY.test(d) || !isObj(h) || !Object.entries(h).every(([k, v]) => (k === "new" || k === "reviews") && whole(v))) return null;
  }
  return normalizeState({ cards, prof, settings: kept, stats: { xp, streak, lastStudyDay, history } });
}
