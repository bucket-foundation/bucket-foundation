import { FSRS, DAY_MS, type Card, type Rating } from "./fsrs";
import { fusedConceptMastery, type ProficiencyState, type StoredEngineState } from "./mastery";

export interface QuizItem {
  level?: string;
  prompt: string;
  answer: string;
}

export interface Atom {
  id: string;
  title: string;
  shell?: "prereq" | "nucleus" | "frontier" | string;
  type?: string;
  requires?: string[];
  unlocks?: string[];
  leverage?: number;
  equation?: string;
  summary?: string;
  lesson?: string;
  depths?: Record<string, string> | string[];
  note?: string;
  sources?: string[];
  resources?: { label: string; url: string }[];
  quiz?: QuizItem[];
  gloss?: string;
}

export interface EngineState extends StoredEngineState {
  cards: Record<string, Card>;
  prof: Record<string, ProficiencyState>;
  settings: { newPerDay: number; requestRetention: number };
  stats: { xp: number; streak: number; lastStudyDay: string | null; history: Record<string, { new: number; reviews: number }> };
}

export type Depth = "recall" | "apply" | "derive" | "teach";

export const ADAPTIVE = {
  ENCOMPASS_BASE: 0.6,
  ENCOMPASS_DECAY: 0.5,
  ENCOMPASS_MIN: 0.05,
  ENCOMPASS_MAX_HOPS: 4,
  FIRE_MAX_CREDIT: 0.5,
  FIRE_MAX_STABILITY_GAIN: 0.15,
  FIRE_MIN_RETRIEVABILITY: 0.6,
  FIRE_MIN_RATING: 3,
  PROF_INIT: 0.0,
  PROF_K_A: 1.0,
  PROF_K_B: 0.05,
  PROF_DEPTH_B: { recall: -0.8, apply: -0.2, derive: 0.6, teach: 1.2 } as Record<string, number>,
  PROF_RATING_SCORE: { 1: 0.0, 2: 0.6, 3: 1.0, 4: 1.0 } as Record<number, number>,
  PROF_SLOPE: 1.0,
};

const DEPTH_XP: Record<string, number> = { recall: 5, apply: 8, derive: 14, teach: 20 };

export function emptyState(): EngineState {
  return {
    cards: {},
    prof: {},
    settings: { newPerDay: 4, requestRetention: 0.9 },
    stats: { xp: 0, streak: 0, lastStudyDay: null, history: {} },
  };
}

export function normalizeState(raw: unknown): EngineState {
  const s = (raw && typeof raw === "object" ? raw : {}) as Partial<EngineState>;
  const base = emptyState();
  return {
    cards: { ...(s.cards ?? {}) } as Record<string, Card>,
    prof: { ...(s.prof ?? {}) },
    settings: { ...base.settings, ...(s.settings ?? {}) } as EngineState["settings"],
    stats: {
      xp: s.stats?.xp ?? 0,
      streak: s.stats?.streak ?? 0,
      lastStudyDay: s.stats?.lastStudyDay ?? null,
      history: { ...(s.stats?.history ?? {}) } as EngineState["stats"]["history"],
    },
  };
}

export function dayKey(now: number = Date.now()): string {
  const d = new Date(now);
  return d.getFullYear() + "-" + (d.getMonth() + 1) + "-" + d.getDate();
}

export function withLeverage(atoms: Atom[]): Atom[] {
  const out = atoms.map((a) => ({ ...a, unlocks: [] as string[] }));
  const byId = new Map(out.map((a) => [a.id, a]));
  out.forEach((a) => {
    (a.requires ?? []).forEach((r) => {
      const p = byId.get(r);
      if (p && !p.unlocks!.includes(a.id)) p.unlocks!.push(a.id);
    });
  });
  const descendants = (id: string, seen = new Set<string>()): Set<string> => {
    const a = byId.get(id);
    if (!a) return seen;
    (a.unlocks ?? []).forEach((u) => {
      if (!seen.has(u)) {
        seen.add(u);
        descendants(u, seen);
      }
    });
    return seen;
  };
  const reach = new Map<string, number>();
  let max = 1;
  out.forEach((a) => {
    const r = descendants(a.id).size + (a.unlocks?.length ?? 0) * 0.5;
    reach.set(a.id, r);
    max = Math.max(max, r);
  });
  out.forEach((a) => {
    a.leverage = +((reach.get(a.id) ?? 0) / max).toFixed(3);
  });
  return out;
}

export interface EncEdge {
  id: string;
  weight: number;
  dist: number;
}

export function buildEncompassingMap(atoms: Atom[]): Record<string, EncEdge[]> {
  const byId = new Map(atoms.map((a) => [a.id, a]));
  const map: Record<string, EncEdge[]> = {};
  atoms.forEach((a) => {
    const best = new Map<string, number>();
    let frontier = (a.requires ?? []).map((r) => ({ id: r, d: 1 }));
    while (frontier.length) {
      const next: { id: string; d: number }[] = [];
      for (const node of frontier) {
        if (node.id === a.id) continue;
        const prev = best.get(node.id);
        if (prev !== undefined && prev <= node.d) continue;
        best.set(node.id, node.d);
        if (node.d >= ADAPTIVE.ENCOMPASS_MAX_HOPS) continue;
        const p = byId.get(node.id);
        if (!p) continue;
        (p.requires ?? []).forEach((r2) => next.push({ id: r2, d: node.d + 1 }));
      }
      frontier = next;
    }
    const edges: EncEdge[] = [];
    best.forEach((d, pid) => {
      if (!byId.has(pid)) return;
      const w = ADAPTIVE.ENCOMPASS_BASE * Math.pow(ADAPTIVE.ENCOMPASS_DECAY, d - 1);
      if (w >= ADAPTIVE.ENCOMPASS_MIN) edges.push({ id: pid, weight: +w.toFixed(4), dist: d });
    });
    edges.sort((x, y) => y.weight - x.weight);
    map[a.id] = edges;
  });
  return map;
}

const sigmoid = (x: number) => 1 / (1 + Math.exp(-x));

export function updateProficiency(prof: ProficiencyState | undefined, depth: string, score: number): ProficiencyState {
  const p = prof && typeof prof.theta === "number" ? { theta: prof.theta, n: prof.n ?? 0 } : { theta: ADAPTIVE.PROF_INIT, n: 0 };
  const b = ADAPTIVE.PROF_DEPTH_B[depth] ?? 0;
  const P = sigmoid(ADAPTIVE.PROF_SLOPE * (p.theta - b));
  const K = ADAPTIVE.PROF_K_A / (1 + ADAPTIVE.PROF_K_B * p.n);
  return { theta: p.theta + K * (score - P), n: p.n + 1 };
}

export interface FirePatch {
  id: string;
  stability: number;
  due: number;
  credit: number;
  weight: number;
}

export function fireCredits(edges: EncEdge[], cards: Record<string, Card>, fsrs: FSRS, now: number, ratingScore: number): FirePatch[] {
  const patches: FirePatch[] = [];
  edges.forEach((e) => {
    const card = cards[e.id];
    if (!card || card.stability == null || card.state === "new") return;
    const elapsed = Math.max(0, (now - (card.lastReview || now)) / DAY_MS);
    const R = fsrs.retrievability(elapsed, card.stability);
    if (R < ADAPTIVE.FIRE_MIN_RETRIEVABILITY) return;
    const credit = Math.min(ADAPTIVE.FIRE_MAX_CREDIT, e.weight * ADAPTIVE.FIRE_MAX_CREDIT) * ratingScore;
    if (credit <= 0) return;
    const gain = Math.min(ADAPTIVE.FIRE_MAX_STABILITY_GAIN, credit * ADAPTIVE.FIRE_MAX_STABILITY_GAIN);
    const newS = card.stability * (1 + gain);
    const ivl = fsrs.interval(newS);
    const newDue = Math.max(card.due || 0, (card.lastReview || now) + ivl * DAY_MS);
    patches.push({ id: e.id, stability: +newS.toFixed(4), due: newDue, credit: +credit.toFixed(4), weight: e.weight });
  });
  return patches;
}

export interface RouteItem {
  id: string;
  kind: "review" | "new";
  due?: number;
}

const SHELL_RANK: Record<string, number> = { prereq: 0, nucleus: 1, frontier: 2 };

function unlocked(atom: Atom, cards: Record<string, Card>): boolean {
  return (atom.requires ?? []).every((r) => Boolean(cards[r]));
}

export function route(state: EngineState, atoms: Atom[], now: number = Date.now()): RouteItem[] {
  const byId = new Set(atoms.map((a) => a.id));
  const due: RouteItem[] = [];
  Object.entries(state.cards).forEach(([id, c]) => {
    if (c && c.due != null && c.due <= now && byId.has(id)) due.push({ id, kind: "review", due: c.due });
  });
  due.sort((a, b) => (a.due ?? 0) - (b.due ?? 0));
  const introducedToday = state.stats.history[dayKey(now)]?.new ?? 0;
  const budget = Math.max(0, (state.settings.newPerDay || 4) - introducedToday);
  const fresh = atoms
    .filter((a) => !state.cards[a.id] && unlocked(a, state.cards))
    .sort((a, b) => (SHELL_RANK[a.shell ?? "nucleus"] ?? 1) - (SHELL_RANK[b.shell ?? "nucleus"] ?? 1) || (b.leverage ?? 0) - (a.leverage ?? 0))
    .slice(0, budget)
    .map((a) => ({ id: a.id, kind: "new" as const }));
  return due.concat(fresh);
}

export function makeFsrs(state: EngineState): FSRS {
  const f = new FSRS();
  f.requestRetention = state.settings.requestRetention || 0.9;
  return f;
}

export function grade(
  state: EngineState,
  atoms: Atom[],
  encompassing: Record<string, EncEdge[]>,
  id: string,
  rating: Rating,
  level: Depth = "recall",
  now: number = Date.now()
): EngineState {
  const next = normalizeState(state);
  const fsrs = makeFsrs(next);
  const prev = next.cards[id] ?? { state: "new" };
  const wasNew = !next.cards[id] || prev.state === "new";
  next.cards[id] = fsrs.review(prev, rating, now);

  const score = ADAPTIVE.PROF_RATING_SCORE[rating] ?? (rating > 1 ? 1 : 0);
  next.prof[id] = updateProficiency(next.prof[id], level, score);
  if (rating >= ADAPTIVE.FIRE_MIN_RATING) {
    fireCredits(encompassing[id] ?? [], next.cards, fsrs, now, score).forEach((p) => {
      const c = next.cards[p.id];
      if (!c) return;
      next.cards[p.id] = { ...c, stability: p.stability, due: p.due, firedCredit: +((c.firedCredit ?? 0) + p.credit).toFixed(4) };
    });
  }

  if (rating > 1) next.stats.xp += DEPTH_XP[level] ?? 5;
  const dk = dayKey(now);
  const h = (next.stats.history[dk] = next.stats.history[dk] ?? { new: 0, reviews: 0 });
  if (wasNew) h.new += 1;
  else h.reviews += 1;

  const last = next.stats.lastStudyDay;
  if (last !== dk) {
    next.stats.streak = last === dayKey(now - DAY_MS) ? (next.stats.streak || 0) + 1 : 1;
    next.stats.lastStudyDay = dk;
  }
  void atoms;
  return next;
}

export function masteryFor(state: EngineState, id: string): number {
  return fusedConceptMastery(state.cards[id], state.prof[id]).mastery;
}

export function pickLevel(state: EngineState, atom: Atom): Depth {
  const m = masteryFor(state, atom.id);
  const have = (atom.quiz ?? []).map((q) => q.level);
  const order: Depth[] = ["recall", "apply", "derive", "teach"];
  const target: Depth = m < 0.25 ? "recall" : m < 0.5 ? "apply" : m < 0.75 ? "derive" : "teach";
  for (let k = order.indexOf(target); k >= 0; k--) if (have.includes(order[k])) return order[k];
  return (have[0] as Depth) ?? "recall";
}

export interface Summary {
  total: number;
  introduced: number;
  mastered: number;
  dueCount: number;
  xp: number;
  streak: number;
}

export function summary(state: EngineState, atoms: Atom[], now: number = Date.now()): Summary {
  let introduced = 0;
  let mastered = 0;
  let dueCount = 0;
  atoms.forEach((a) => {
    const c = state.cards[a.id];
    if (!c) return;
    introduced++;
    if (masteryFor(state, a.id) >= 0.7) mastered++;
    if (c.due != null && c.due <= now) dueCount++;
  });
  return { total: atoms.length, introduced, mastered, dueCount, xp: state.stats.xp || 0, streak: state.stats.streak || 0 };
}

function latestDay(a: string | null, b: string | null): string | null {
  if (!a) return b;
  if (!b) return a;
  return new Date(a).getTime() >= new Date(b).getTime() ? a : b;
}

export function mergeState(a: EngineState | null, b: EngineState | null): EngineState {
  if (!a) return normalizeState(b);
  if (!b) return normalizeState(a);
  const out = emptyState();
  out.settings = { ...a.settings, ...b.settings };
  const ids = new Set([...Object.keys(a.cards), ...Object.keys(b.cards)]);
  ids.forEach((id) => {
    const ca = a.cards[id];
    const cb = b.cards[id];
    if (!ca) out.cards[id] = cb;
    else if (!cb) out.cards[id] = ca;
    else out.cards[id] = (cb.lastReview || 0) >= (ca.lastReview || 0) ? cb : ca;
  });
  const pids = new Set([...Object.keys(a.prof ?? {}), ...Object.keys(b.prof ?? {})]);
  pids.forEach((id) => {
    const pa = a.prof?.[id];
    const pb = b.prof?.[id];
    out.prof[id] = !pa ? pb! : !pb ? pa : (pb.n ?? 0) >= (pa.n ?? 0) ? pb : pa;
  });
  out.stats.xp = Math.max(a.stats.xp || 0, b.stats.xp || 0);
  out.stats.streak = Math.max(a.stats.streak || 0, b.stats.streak || 0);
  out.stats.lastStudyDay = latestDay(a.stats.lastStudyDay, b.stats.lastStudyDay);
  const days = new Set([...Object.keys(a.stats.history), ...Object.keys(b.stats.history)]);
  days.forEach((d) => {
    const x = a.stats.history[d] ?? { new: 0, reviews: 0 };
    const y = b.stats.history[d] ?? { new: 0, reviews: 0 };
    out.stats.history[d] = { new: Math.max(x.new || 0, y.new || 0), reviews: Math.max(x.reviews || 0, y.reviews || 0) };
  });
  return out;
}
