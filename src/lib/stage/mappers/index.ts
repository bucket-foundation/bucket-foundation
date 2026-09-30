import { BRANCH_COUNT, branchIndex } from "../../../components/canon-globe/projections";
import { ERAS, timeCoord } from "../../explore/time";
import type { Hit } from "../../explore/search";
import { clamp01 } from "../shape";
import type { Edge, StageProfile, StageRecord } from "../record";

const TAU = Math.PI * 2;

export const STAGE_TYPES = ["excerpt", "advisor", "work", "paper", "text", "talk", "canon-file", "you"] as const;
export type StageType = (typeof STAGE_TYPES)[number];

export type StageSource = Omit<Hit, "type"> & { type: string };

export interface MapperContext {
  thetaOf?: (id: string) => number | undefined;
  year?: number;
}

export interface Placement {
  theta: number;
  r: number;
  t: number | null;
}

export type Mapper = (src: StageSource, ctx: MapperContext) => Placement;

export const DEFAULT_YEAR = 2026;

export function hashTheta(id: string): number {
  let h = 2166136261;
  for (let i = 0; i < id.length; i++) {
    h ^= id.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return ((h >>> 0) / 4294967296) * TAU;
}

export function timeOf(year: number | null): number | null {
  return year === null || !Number.isFinite(year) ? null : timeCoord(year) / ERAS.length;
}

export function branchRing(branch: string): number {
  return 0.3 + 0.6 * (branchIndex(branch) / (BRANCH_COUNT - 1));
}

function thetaFor(src: StageSource, ctx: MapperContext): number {
  return ctx.thetaOf?.(src.id) ?? hashTheta(src.id);
}

function meanAngle(angles: number[]): number {
  const x = angles.reduce((s, a) => s + Math.cos(a), 0);
  const y = angles.reduce((s, a) => s + Math.sin(a), 0);
  return ((Math.atan2(y, x) % TAU) + TAU) % TAU;
}

const onRing = (ring: (src: StageSource) => number): Mapper => (src, ctx) => ({ theta: thetaFor(src, ctx), r: clamp01(ring(src)), t: timeOf(src.year) });

export const MAPPERS: Record<StageType, Mapper> = {
  excerpt: onRing((s) => branchRing(s.branch)),
  advisor: onRing((s) => 0.2 + 0.7 * clamp01(s.score)),
  work: (src, ctx) => {
    const members = src.links.map((id) => ctx.thetaOf?.(id) ?? hashTheta(id));
    return { theta: members.length ? meanAngle(members) : thetaFor(src, ctx), r: 0.5, t: timeOf(src.year) };
  },
  paper: onRing((s) => branchRing(s.branch)),
  text: onRing(() => 0.95),
  talk: onRing(() => 0.85),
  "canon-file": onRing((s) => branchRing(s.branch)),
  you: (_src, ctx) => ({ theta: 0, r: 0, t: timeOf(ctx.year ?? DEFAULT_YEAR) }),
};

const FALLBACK: Mapper = onRing(() => 0.6);

export function typeOfSource(src: Pick<StageSource, "id" | "type">): string {
  if ((STAGE_TYPES as readonly string[]).includes(src.type)) return src.type;
  const prefix = src.id.split(":")[0];
  return (STAGE_TYPES as readonly string[]).includes(prefix) ? prefix : src.type;
}

export function mapperFor(type: string): Mapper {
  return (MAPPERS as Record<string, Mapper>)[type] ?? FALLBACK;
}

function profileOf(src: StageSource, type: string): StageProfile {
  return {
    kicker: src.subtitle || type,
    date: src.year === null ? null : String(src.year),
    title: src.title,
    figure: null,
    caption: null,
    body: src.text,
    links: src.url ? [{ label: src.title, url: src.url }] : [],
    scores: {},
    sizeMetres: null,
  };
}

function edgesOf(src: StageSource): Edge[] {
  return src.edges ?? src.links.map((to) => ({ to, kind: "cites" as const, reason: "linked hit", weight: 1 }));
}

export function toStageRecord(src: StageSource, ctx: MapperContext = {}): StageRecord {
  const type = typeOfSource(src);
  const p = mapperFor(type)(src, ctx);
  return { id: src.id, type, theta: p.theta, r: p.r, t: p.t, profile: profileOf(src, type), links: edgesOf(src) };
}
