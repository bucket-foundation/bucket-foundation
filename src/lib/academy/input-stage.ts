import type { EngineState } from "./engine";
import { known, KNOWN_R, NO_FREQ, type FreqLookup } from "./learner-model";
import type { ExposureInput } from "./learn-log";
import { planBundle, select, unitLemmas, type InputBundle, type InputItem, type InputUnit, type Learner, type Plan } from "./input-selector";
import type { LemmaResolver } from "./exposure-replay";
import { unitSeconds } from "./input-mix";

export const MAX_EXPOSURE_SECONDS = 3600;
const LEMMA = /^\S{1,40}$/;

export type InputMode = "off" | "on" | "demo";

export function inputMode(env: string | undefined = process.env.NEXT_PUBLIC_POLINGUAL_INPUT_STAGE, nodeEnv: string | undefined = process.env.NODE_ENV, vercelEnv: string | undefined = process.env.NEXT_PUBLIC_VERCEL_ENV ?? process.env.VERCEL_ENV): InputMode {
  const production = nodeEnv === "production" || vercelEnv === "production";
  if (env === "0" || env === "false") return "off";
  if (env === "1" || env === "true") return "on";
  if (env === "demo" && !production) return "demo";
  return production ? "off" : "on";
}

export function inputStageOn(env?: string, nodeEnv?: string, vercelEnv?: string): boolean {
  return inputMode(env, nodeEnv, vercelEnv) !== "off";
}

export function eligibleUnitSeconds(bundle: InputBundle, learner: Learner, mode: InputMode): number[] {
  const plans = planBundle(bundle, learner);
  const ok = plans.filter((p) => p.eligible).map((p) => unitSeconds(p.tokens));
  if (ok.length || mode !== "demo") return ok;
  const fallback = chooseUnit(bundle, learner);
  return fallback ? [unitSeconds(fallback.plan.tokens)] : [];
}

export function learnerFromState(state: EngineState, lang: string, resolve: LemmaResolver, now: number, tier: number, due: ReadonlySet<string>, recent: Readonly<Record<string, number>> = {}, lastVideo: string | null = null, freq: FreqLookup = NO_FREQ): Learner {
  const card = (lemma: string) => {
    const id = resolve(lang, lemma);
    return id ? state.cards[id] : undefined;
  };
  return {
    p: (lemma) => {
      const c = card(lemma);
      return known({ stability: c?.stability, lastReview: c?.lastReview, freq: freq(lemma) }, now, tier).p;
    },
    due,
    rank: (lemma) => freq(lemma)?.rank ?? null,
    recent,
    lastVideo,
  };
}

export function knownWords(state: EngineState, lang: string, now: number): number {
  let n = 0;
  const prefix = `${lang}:`;
  for (const [id, c] of Object.entries(state.cards)) {
    if (id.startsWith(prefix) && known({ stability: c.stability, lastReview: c.lastReview }, now, 0).p >= KNOWN_R) n++;
  }
  return n;
}

export function dueLemmas(bundle: InputBundle, state: EngineState, lang: string, resolve: LemmaResolver, now: number): Set<string> {
  const out = new Set<string>();
  for (const item of bundle.items) {
    for (const t of item.tokens) {
      const id = resolve(lang, t.lemma);
      const due = id ? state.cards[id]?.due : undefined;
      if (typeof due === "number" && due <= now) out.add(t.lemma);
    }
  }
  return out;
}

export interface StageChoice {
  unit: InputUnit;
  items: InputItem[];
  plan: Plan;
  fallback: boolean;
}

export function chooseUnit(bundle: InputBundle, learner: Learner, allowFallback = true): StageChoice | null {
  const items = new Map(bundle.items.map((i) => [i.id, i]));
  const byId = new Map(bundle.units.map((u) => [u.id, u]));
  const pick = select(planBundle(bundle, learner), learner, (id) => unitLemmas(byId.get(id)!, items));
  if (!pick || (pick.fallback && !allowFallback)) return null;
  const unit = byId.get(pick.plan.unit)!;
  return { unit, items: unit.itemIds.map((id) => items.get(id)).filter((i): i is InputItem => !!i), plan: pick.plan, fallback: pick.fallback };
}

export interface TapState {
  taps: Readonly<Record<string, readonly string[]>>;
}

export function toggleTap(s: TapState, itemId: string, lemma: string): TapState {
  const cur = s.taps[itemId] ?? [];
  const next = cur.includes(lemma) ? cur.filter((x) => x !== lemma) : [...cur, lemma];
  return { taps: { ...s.taps, [itemId]: next } };
}

export interface Viewing {
  taps: TapState;
  seenMs: Readonly<Record<string, number>>;
  revealed: ReadonlySet<string>;
}

export const EMPTY_VIEWING: Viewing = { taps: { taps: {} }, seenMs: {}, revealed: new Set() };

export function addSeen(v: Viewing, visible: readonly string[], ms: number): Viewing {
  if (ms <= 0 || !visible.length) return v;
  const share = ms / visible.length;
  const seenMs = { ...v.seenMs };
  for (const id of visible) seenMs[id] = (seenMs[id] ?? 0) + share;
  return { ...v, seenMs };
}

export function reveal(v: Viewing, itemId: string): Viewing {
  return { ...v, revealed: new Set([...Array.from(v.revealed), itemId]) };
}

export function exposureRows(choice: StageChoice, v: Viewing, completed: boolean): ExposureInput[] {
  return choice.items.flatMap((item) => {
    const ms = v.seenMs[item.id] ?? 0;
    if (ms <= 0) return [];
    const lemmas = Array.from(new Set(item.tokens.map((t) => t.lemma).filter((l) => LEMMA.test(l)))).slice(0, 200);
    return [
      {
        item: item.id,
        unit: choice.unit.id,
        lemmas_seen: lemmas,
        taps: Array.from(new Set(v.taps.taps[item.id] ?? [])).filter((l) => LEMMA.test(l)).slice(0, 50),
        seconds: Math.min(MAX_EXPOSURE_SECONDS, Math.max(0, Math.round(ms / 1000))),
        coverage_pred: Math.round(Math.min(1, Math.max(0, choice.plan.coverage)) * 1e4) / 1e4,
        completed,
        revealed: v.revealed.has(item.id),
      },
    ];
  });
}
