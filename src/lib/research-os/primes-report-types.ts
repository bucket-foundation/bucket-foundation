import type { GapClass } from "./prime-algebra";
import type { PrimeSummary } from "./primes";
import type { LineageSummary } from "./medallion/report";

export type ReportNode = { id: string; slug: string | null; title: string | null; kind: string | null; branch: string | null };
export type ReportEdge = { from_id: string; to_id: string; kind: string; confidence: number | null };

export interface ReportRef {
  slug: string | null;
  title: string;
  kind: string | null;
  branch: string | null;
}

export interface PrimesReport {
  generatedAt: string;
  summary: PrimeSummary;
  unfactoredByKind: { kind: string; count: number }[];
  penetrating: (ReportRef & { composites: number; branches: number; spread: number })[];
  deepest: (ReportRef & { depth: number; primes: number })[];
  widest: (ReportRef & { depth: number; primes: number })[];
  confirmedIrreducible: { count: number; of: number; sample: ReportRef[] };
  reviewAgain: ReportRef[];
  algebra: PrimeAlgebraReport;
  lineage?: LineageBlock;
}

export type LineageBlock = { ok: true; summary: LineageSummary } | { ok: false; unavailable: string };

export interface PrimeAlgebraReport {
  coverage: { s: number; coverage: number; supports: number }[];
  frontier: {
    pairs: number;
    triples: number;
    expectedAtLeastOne: number;
    withinBranch: number;
    top: GapRow[];
    topWithinBranch: GapRow[];
    gaps: { draws: number; counts: Record<GapClass, number>; counterfactualPairs: number };
  };
  together: { a: ReportRef; b: ReportRef; joint: number; pmi: number }[];
  implied: { node: ReportRef; factor: ReportRef; support: number; mutual: boolean }[];
  reach: (ReportRef & { coefficients: number[]; meanDepth: number })[];
}

export type GapRow = { primes: ReportRef[]; expected: number; p: string; gap: GapClass };

export type PendingPair = { from_id: string; to_id: string };

export type ReportOptions = { now?: Date; pendingConfirmed?: PendingPair[]; nullDraws?: number };

export type PrimesViewState = { kind: "unconfigured" } | { kind: "failed" } | { kind: "ready"; report: PrimesReport };
