import { ERAS } from "./geometry";
import type { AdvisorReview, PrimeDirections } from "../research-os/advisor-review";

export const SPACE_SCHEMA = "bucket.explore-space/1";
export const MAX_OBSERVATIONS = 20_000;
export const MAX_COMPONENTS = 64;
export const SIGMA_SPAN = 2.5;
const ERA_BOUND = 1e6;

export type FieldKind = "number" | "category" | "tokens" | "time";

export interface SpaceField {
  key: string;
  kind: FieldKind;
}

export interface SpaceComponent {
  index: number;
  angle_deg: number;
  variance_ratio: number;
  label?: string;
  top_terms: string[];
  bottom_terms: string[];
}

export type Meta = Record<string, string | number | null>;

export interface SpaceObservation {
  id: string;
  title: string;
  scores: number[];
  t?: number | null;
  meta: Meta;
  links: string[];
  coverage?: number;
}

export interface SweepBin {
  label: string;
  from: number;
  to: number;
}

export interface Dataset {
  schema: typeof SPACE_SCHEMA;
  id: string;
  label: string;
  sample?: boolean;
  fields: SpaceField[];
  components: SpaceComponent[];
  mean: number[];
  sweep?: { field: string; bins: SweepBin[] };
  obs: SpaceObservation[];
}

export class SpaceError extends Error {}

const FIELD_KINDS: FieldKind[] = ["number", "category", "tokens", "time"];

function isObj(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function finite(v: unknown): v is number {
  return typeof v === "number" && Number.isFinite(v);
}

function strings(v: unknown, cap: number): string[] {
  return Array.isArray(v) ? v.filter((x): x is string => typeof x === "string").slice(0, cap) : [];
}

export function meanScores(obs: Pick<SpaceObservation, "scores">[], k: number): number[] {
  const out = new Array<number>(k).fill(0);
  if (!obs.length) return out;
  for (const o of obs) for (let i = 0; i < k; i++) out[i] += o.scores[i] ?? 0;
  return out.map((v) => v / obs.length);
}

export function parseDataset(raw: unknown): Dataset {
  if (!isObj(raw) || raw.schema !== SPACE_SCHEMA) throw new SpaceError(`expected a ${SPACE_SCHEMA} file`);
  if (!Array.isArray(raw.components) || raw.components.length < 3) throw new SpaceError("a dataset needs at least 3 components");
  if (raw.components.length > MAX_COMPONENTS) throw new SpaceError(`a dataset has at most ${MAX_COMPONENTS} components`);
  if (!Array.isArray(raw.obs)) throw new SpaceError("the dataset has no observations list");
  if (raw.obs.length > MAX_OBSERVATIONS) throw new SpaceError(`a dataset has at most ${MAX_OBSERVATIONS} observations`);
  const k = raw.components.length;
  const components = raw.components.map((c, i): SpaceComponent => {
    if (!isObj(c) || !finite(c.angle_deg) || !finite(c.variance_ratio)) throw new SpaceError(`component ${i + 1} is malformed`);
    return {
      index: finite(c.index) ? c.index : i + 1,
      angle_deg: c.angle_deg,
      variance_ratio: c.variance_ratio,
      label: typeof c.label === "string" ? c.label : undefined,
      top_terms: strings(c.top_terms, 20),
      bottom_terms: strings(c.bottom_terms, 20),
    };
  });
  const obs = raw.obs.map((o, i): SpaceObservation => {
    if (!isObj(o) || typeof o.id !== "string" || typeof o.title !== "string" || !Array.isArray(o.scores)) throw new SpaceError(`observation ${i} is malformed`);
    if (o.scores.length !== k || !o.scores.every(finite)) throw new SpaceError(`observation ${o.id} needs ${k} finite scores`);
    if (o.t !== undefined && o.t !== null && !finite(o.t)) throw new SpaceError(`observation ${o.id} has a non-finite t`);
    const meta: Meta = {};
    if (isObj(o.meta)) for (const [key, v] of Object.entries(o.meta)) if (typeof v === "string" || finite(v) || v === null) meta[key] = v;
    return { id: o.id, title: o.title, scores: o.scores as number[], t: o.t as number | null | undefined, meta, links: strings(o.links, 50), coverage: finite(o.coverage) ? o.coverage : undefined };
  });
  const fields = Array.isArray(raw.fields)
    ? raw.fields.filter((f): f is Record<string, unknown> => isObj(f) && typeof f.key === "string" && FIELD_KINDS.includes(f.kind as FieldKind)).map((f) => ({ key: f.key as string, kind: f.kind as FieldKind }))
    : [];
  const mean = Array.isArray(raw.mean) && raw.mean.length === k && raw.mean.every(finite) ? (raw.mean as number[]) : meanScores(obs, k);
  let sweep: Dataset["sweep"];
  if (isObj(raw.sweep) && typeof raw.sweep.field === "string" && Array.isArray(raw.sweep.bins)) {
    const bins = raw.sweep.bins.filter((b): b is Record<string, unknown> => isObj(b) && typeof b.label === "string" && typeof b.from === "number" && typeof b.to === "number");
    sweep = { field: raw.sweep.field, bins: bins.map((b) => ({ label: b.label as string, from: b.from as number, to: b.to as number })) };
  }
  return { schema: SPACE_SCHEMA, id: typeof raw.id === "string" ? raw.id : "dataset", label: typeof raw.label === "string" ? raw.label : "dataset", sample: raw.sample === true, fields, components, mean, sweep, obs };
}

export function radiusOf(score: number): number {
  return Math.min(1, Math.max(0.02, (score + SIGMA_SPAN) / (2 * SIGMA_SPAN)));
}

export function spokeAngle(component: Pick<SpaceComponent, "angle_deg">): number {
  return (component.angle_deg * Math.PI) / 180;
}

export interface PolarSample {
  angle: number;
  u: number;
  r: number;
}

export interface SmoothOptions {
  angleVariance?: number;
  sweepVariance?: number;
  fallback?: number;
}

export function smooth(points: PolarSample[], u: number, angle: number, opts: SmoothOptions = {}): number {
  const av = opts.angleVariance ?? 0.4;
  const sv = opts.sweepVariance ?? 0.5;
  let w = 0;
  let v = 0;
  for (const p of points) {
    const d = Math.atan2(Math.sin(angle - p.angle), Math.cos(angle - p.angle));
    const k = Math.exp(-((u - p.u) ** 2) / sv - (d * d) / av);
    w += k;
    v += k * p.r;
  }
  return w > 1e-3 ? v / w : opts.fallback ?? 0;
}

export function circleProfile(scores: number[], angles: number[], samples = 120, angleVariance = 0.25): number[] {
  const points = scores.map((s, i) => ({ angle: angles[i], u: 0, r: radiusOf(s) }));
  return Array.from({ length: samples }, (_, j) => smooth(points, 0, (j / samples) * Math.PI * 2, { angleVariance, fallback: radiusOf(0) }));
}

export function bandAverages(ds: Dataset): (number[] | null)[] {
  if (!ds.sweep) return [];
  const k = ds.components.length;
  return ds.sweep.bins.map((bin) => {
    const inBin = ds.obs.filter((o) => typeof o.t === "number" && o.t >= bin.from && o.t <= bin.to);
    return inBin.length ? meanScores(inBin, k) : null;
  });
}

export function fromPrimeDirections(prime: PrimeDirections, docs: { id: string; title: string; scores: number[] }[] = [], sample = false): Dataset {
  const components = prime.components.map((c): SpaceComponent => ({ ...c, label: c.top_terms[0] }));
  const obs = docs.map((d): SpaceObservation => ({ id: d.id, title: d.title, scores: d.scores, meta: {}, links: [] }));
  return { schema: SPACE_SCHEMA, id: prime.corpus, label: prime.corpus, sample, fields: [{ key: "scores", kind: "number" }], components, mean: meanScores(obs, components.length), obs };
}

export function fromAdvisorReview(review: AdvisorReview, prime: PrimeDirections, sample = false): Dataset {
  const base = fromPrimeDirections(prime, [], sample);
  const k = base.components.length;
  const obs = review.rows
    .filter((r) => r.star_prime.length === k)
    .map((r): SpaceObservation => {
      const year = typeof r.fields.year === "number" ? r.fields.year : null;
      const field = typeof r.fields.field === "string" ? r.fields.field : null;
      return { id: `advisor:${r.rank}`, title: r.name, scores: r.star_prime.map((v) => (v - 0.5) * 2 * SIGMA_SPAN), t: year, meta: { field, score: r.score }, links: Object.values(r.links).filter((l) => /^https?:/.test(l)) };
    });
  return {
    ...base,
    id: review.key || "advisors",
    label: "advisors",
    fields: [{ key: "star_prime", kind: "number" }, { key: "year", kind: "time" }],
    mean: meanScores(obs, k),
    sweep: { field: "year", bins: ERAS.map((e) => ({ label: e.label, from: Math.max(e.from, -ERA_BOUND), to: Math.min(e.to, ERA_BOUND) })) },
    obs,
  };
}
