import type { Zone } from "./solvability-frontier";

export interface PackedRecords {
  schema: string;
  built: string;
  model: string;
  revision: string;
  threshold: number;
  neighbours: number;
  axes: { component: number; explained: number; positive: string[]; negative: string[] }[];
  tables: { branch: string[]; form: string[]; status: string[]; zone: Zone[]; source: { 0: string; 1: string }[]; text: string[] };
  rows: PackedRow[];
}

export interface PackedRow {
  id: string;
  t: string;
  b: number;
  f: number;
  v: number;
  s: number;
  p: number | null;
  r: number | null;
  pe: number;
  st: string;
  so: number;
  ss: number;
  ts: number;
  k: string[];
  m: string[];
  z: number;
  re: number;
  ra: number;
  th: number;
  pc: number[];
  ns: number[];
  no: number[];
  cut?: 1;
  h?: HandFields;
}

export interface HandFields {
  aliases: string[];
  level: number;
  history: { year: number; event: string; source: string }[];
  formal: { status: string; source: string | null; url: string | null };
  quality: { status: string; reason: string };
  related: { id: string; why: string }[];
  statement_source: string | null;
  key_works: { title: string; year: number | null; cited_by_count: number; role: string; doi: string | null }[];
  people: { name: string; works: number }[];
  organizations: { name: string; works: number }[];
  activity_total: number;
  quality_status: string;
}

export type Coding = "settled" | "advanced" | "open";

export interface NeighbourRef {
  id: string;
  title: string;
  similarity: number;
  status: string;
  zone: Zone;
}

export interface ProblemRecord {
  id: string;
  title: string;
  branch: string;
  form: string;
  variantOf: { id: string; title: string } | null;
  status: string;
  coding: Coding;
  posed: number | null;
  resolved: number | null;
  posedEvidence: string;
  statement: string;
  statementCut: boolean;
  source: string;
  licence: string;
  statementSource: string;
  statusSource: string;
  keywords: string[];
  market: string[];
  zone: Zone;
  reach: number;
  radius: number;
  theta: number;
  pc: number[];
  nearestSolved: NeighbourRef[];
  nearestOpen: NeighbourRef[];
  hand: HandFields | null;
}

export const CODING_OF: Record<string, Coding> = { solved: "settled", partial: "advanced", open: "open" };
export const NEIGHBOUR_STRIDE = 1024;

const indexes = new WeakMap<PackedRecords, Map<string, number>>();

export function recordIndex(data: PackedRecords): Map<string, number> {
  let index = indexes.get(data);
  if (!index) {
    index = new Map(data.rows.map((r, i) => [r.id, i]));
    indexes.set(data, index);
  }
  return index;
}

function neighbours(data: PackedRecords, packed: number[]): NeighbourRef[] {
  return packed.map((x) => {
    const row = data.rows[Math.floor(x / NEIGHBOUR_STRIDE)];
    return { id: row.id, title: row.t, similarity: (x % NEIGHBOUR_STRIDE) / 1000, status: data.tables.status[row.s], zone: data.tables.zone[row.z] };
  });
}

export function recordAt(data: PackedRecords, i: number): ProblemRecord {
  const r = data.rows[i];
  const t = data.tables;
  const [source, licence] = [t.source[r.so][0], t.source[r.so][1]];
  const status = t.status[r.s];
  const parent = r.v >= 0 ? data.rows[r.v] : null;
  return {
    id: r.id,
    title: r.t,
    branch: t.branch[r.b],
    form: t.form[r.f],
    variantOf: parent ? { id: parent.id, title: parent.t } : null,
    status,
    coding: CODING_OF[status],
    posed: r.p,
    resolved: r.r,
    posedEvidence: r.pe >= 0 ? t.text[r.pe] : "",
    statement: r.st,
    statementCut: r.cut === 1,
    source,
    licence,
    statementSource: r.ss >= 0 ? t.text[r.ss] : source,
    statusSource: r.ts >= 0 ? t.text[r.ts] : "",
    keywords: r.k,
    market: r.m,
    zone: t.zone[r.z],
    reach: r.re,
    radius: r.ra,
    theta: r.th,
    pc: r.pc,
    nearestSolved: neighbours(data, r.ns),
    nearestOpen: neighbours(data, r.no),
    hand: r.h ?? null,
  };
}

export function recordFor(data: PackedRecords, id: string, index: Map<string, number> = recordIndex(data)): ProblemRecord | null {
  const i = index.get(id);
  return i === undefined ? null : recordAt(data, i);
}

export function neighbourPositions(data: PackedRecords, record: ProblemRecord): { id: string; theta: number; radius: number; solved: boolean }[] {
  const index = recordIndex(data);
  return [...record.nearestSolved, ...record.nearestOpen].map((n) => {
    const row = data.rows[index.get(n.id)!];
    return { id: n.id, theta: row.th, radius: row.ra, solved: n.zone === "solved" };
  });
}
