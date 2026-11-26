import type { EngineState } from "./engine";
import { known } from "./learner-model";
import type { ExposureInput } from "./learn-log";
import { planBundle, select, unitLemmas, type InputBundle, type InputItem, type InputUnit, type Learner, type Plan } from "./input-selector";
import type { LemmaResolver } from "./exposure-replay";

export const PLACEHOLDER_INPUT_SHARE = 0.3;
export const MAX_EXPOSURE_SECONDS = 3600;
const LEMMA = /^\S{1,40}$/;

export function inputStageOn(env: string | undefined = process.env.NEXT_PUBLIC_POLINGUAL_INPUT_STAGE, nodeEnv: string | undefined = process.env.NODE_ENV): boolean {
  if (env === "0" || env === "false") return false;
  if (env === "1" || env === "true") return true;
  return nodeEnv !== "production";
}

export function inputSlot(queueLength: number, share: number = PLACEHOLDER_INPUT_SHARE): number {
  if (queueLength <= 0) return 0;
  return Math.min(queueLength - 1, Math.max(0, Math.round(queueLength * (1 - share))));
}

export function learnerFromState(state: EngineState, lang: string, resolve: LemmaResolver, now: number, tier: number, due: ReadonlySet<string>, recent: Readonly<Record<string, number>> = {}, lastVideo: string | null = null): Learner {
  const card = (lemma: string) => {
    const id = resolve(lang, lemma);
    return id ? state.cards[id] : undefined;
  };
  return {
    p: (lemma) => {
      const c = card(lemma);
      return known({ stability: c?.stability, lastReview: c?.lastReview }, now, tier).p;
    },
    due,
    rank: () => null,
    recent,
    lastVideo,
  };
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

export function chooseUnit(bundle: InputBundle, learner: Learner): StageChoice | null {
  const items = new Map(bundle.items.map((i) => [i.id, i]));
  const byId = new Map(bundle.units.map((u) => [u.id, u]));
  const pick = select(planBundle(bundle, learner), learner, (id) => unitLemmas(byId.get(id)!, items));
  if (!pick) return null;
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
