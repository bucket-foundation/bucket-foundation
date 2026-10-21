import { ASPECT_IDS, DIRECTION_IDS, type AspectId, type DirectionId } from "./catalog";
import { answerKey, type Answer } from "./answers";
import { bradleyTerry } from "./rank";

export const STABLE_GAP = 0.3;
export const REMATCH_CAP = 6;
export const MEETINGS_MAX = 2;

export interface Card {
  aspect: AspectId;
  a: DirectionId;
  b: DirectionId;
  round: number;
  left: DirectionId;
  right: DirectionId;
}

export function hashString(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function rng(seed: number): () => number {
  let t = seed >>> 0;
  return () => {
    t = (t + 0x6d2b79f5) >>> 0;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r = (r + Math.imul(r ^ (r >>> 7), 61 | r)) ^ r;
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

export function allPairs(ids: readonly DirectionId[] = DIRECTION_IDS): [DirectionId, DirectionId][] {
  const out: [DirectionId, DirectionId][] = [];
  for (let i = 0; i < ids.length; i++) for (let j = i + 1; j < ids.length; j++) out.push([ids[i], ids[j]]);
  return out;
}

export function coverageOrder(seed: number, aspect: AspectId): [DirectionId, DirectionId][] {
  const pairs = allPairs();
  const next = rng(seed ^ hashString(aspect));
  for (let i = pairs.length - 1; i > 0; i--) {
    const j = Math.floor(next() * (i + 1));
    [pairs[i], pairs[j]] = [pairs[j], pairs[i]];
  }
  for (let i = 1; i < pairs.length; i++) {
    const last = pairs[i - 1];
    if (!pairs[i].some((d) => last.includes(d))) continue;
    const k = pairs.findIndex((p, idx) => idx > i && !p.some((d) => last.includes(d)));
    if (k > 0) [pairs[i], pairs[k]] = [pairs[k], pairs[i]];
  }
  return pairs;
}

export function sideFor(seed: number, aspect: AspectId, a: DirectionId, b: DirectionId, round: number): [DirectionId, DirectionId] {
  return hashString(`${seed}:${aspect}:${a}:${b}:${round}`) % 2 === 0 ? [a, b] : [b, a];
}

function card(seed: number, aspect: AspectId, a: DirectionId, b: DirectionId, round: number): Card {
  const [left, right] = sideFor(seed, aspect, a, b, round);
  return { aspect, a, b, round, left, right };
}

export function coverageDone(answers: Answer[], aspect: AspectId): boolean {
  const keys = new Set(answers.filter((x) => x.aspect === aspect && x.round === 0).map((x) => `${x.a}:${x.b}`));
  return allPairs().every(([a, b]) => keys.has(`${a}:${b}`));
}

export function rematches(answers: Answer[], aspect: AspectId): { a: DirectionId; b: DirectionId; round: number }[] {
  const mine = answers.filter((x) => x.aspect === aspect);
  if (!coverageDone(mine, aspect)) return [];
  if (!mine.some((x) => x.choice !== null)) return [];
  const used = mine.filter((x) => x.round > 0).length;
  if (used >= REMATCH_CAP) return [];
  const ranked = bradleyTerry(mine);
  const out: { a: DirectionId; b: DirectionId; round: number }[] = [];
  for (let i = 0; i + 1 < ranked.length; i++) {
    const gap = Math.abs(Math.log(ranked[i].strength) - Math.log(ranked[i + 1].strength));
    if (gap >= STABLE_GAP) continue;
    const [a, b] = ranked[i].id < ranked[i + 1].id ? [ranked[i].id, ranked[i + 1].id] : [ranked[i + 1].id, ranked[i].id];
    const met = mine.filter((x) => x.a === a && x.b === b).length;
    if (met >= MEETINGS_MAX) continue;
    out.push({ a, b, round: met });
  }
  return out.slice(0, REMATCH_CAP - used);
}

export function stable(answers: Answer[], aspect: AspectId): boolean {
  return coverageDone(answers, aspect) && rematches(answers, aspect).length === 0;
}

export function nextCard(seed: number, answers: Answer[]): Card | null {
  const done = new Set(answers.map(answerKey));
  for (const aspect of ASPECT_IDS) {
    for (const [a, b] of coverageOrder(seed, aspect)) {
      if (!done.has(answerKey({ aspect, a, b, round: 0 }))) return card(seed, aspect, a, b, 0);
    }
    const extra = rematches(answers, aspect)[0];
    if (extra) return card(seed, aspect, extra.a, extra.b, extra.round);
  }
  return null;
}

export interface Progress {
  answered: number;
  total: number;
  aspectAnswered: number;
  aspectTotal: number;
}

export function progress(answers: Answer[], current: Card | null): Progress {
  const pairs = allPairs().length;
  let total = 0;
  for (const aspect of ASPECT_IDS) {
    const mine = answers.filter((x) => x.aspect === aspect);
    const extra = mine.filter((x) => x.round > 0).length;
    total += pairs + extra + (coverageDone(answers, aspect) ? rematches(answers, aspect).length : 0);
  }
  const aspect = current?.aspect;
  const mine = aspect ? answers.filter((x) => x.aspect === aspect) : [];
  const aspectTotal = aspect ? pairs + mine.filter((x) => x.round > 0).length + (coverageDone(answers, aspect) ? rematches(answers, aspect).length : 0) : 0;
  return { answered: answers.length, total, aspectAnswered: mine.length, aspectTotal };
}
