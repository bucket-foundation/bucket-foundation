import type { Stage } from "./types";
import { stageAtLeast } from "./types";

export interface QuoteEvidenceRecord {
  nodeId: string;
  locator: string;
  at: string;
}

export interface SourceCheck {
  text: string;
  verified: boolean;
}

function normalizeForMatch(s: string): string {
  return s.trim().toLowerCase().replace(/\s+/g, " ");
}

export function checkSourceProvenance(sourceLines: string[], quoteEvidence: QuoteEvidenceRecord[]): SourceCheck[] {
  const locators = quoteEvidence.map((q) => normalizeForMatch(q.locator)).filter(Boolean);
  return sourceLines.map((text) => {
    const hay = normalizeForMatch(text);
    const verified = hay.length > 0 && locators.some((loc) => hay.includes(loc));
    return { text, verified };
  });
}

export function unverifiedSources(checks: SourceCheck[]): SourceCheck[] {
  return checks.filter((c) => !c.verified);
}

export function hasUnverifiedSource(checks: SourceCheck[]): boolean {
  return unverifiedSources(checks).length > 0;
}

export function isSourceProvenanceStale(sourceLines: string[], checks: SourceCheck[]): boolean {
  return sourceLines.length > 0 && checks.length !== sourceLines.length;
}

export function unverifiedSourceReturnNote(checks: SourceCheck[]): string {
  const bad = unverifiedSources(checks);
  if (bad.length === 0) return "";
  const list = bad.map((c) => `"${c.text}"`).join(", ");
  return (
    `Returned: ${bad.length} source${bad.length === 1 ? "" : "s"} could not be matched to a Quote call you made in the workspace ` +
    `(${list}). Use the Quote tool on each source you cite, then include the locator it returns in your sources list, and resubmit.`
  );
}

export type DuplicateOrigin = "own_prior" | "class_peer" | "canon";

export interface DuplicateCandidate {
  id: string;
  text: string;
  origin: DuplicateOrigin;
}

export interface DuplicateFlag {
  matchId: string;
  matchOrigin: DuplicateOrigin;
  score: number;
}

export const DUPLICATE_OVERLAP_THRESHOLD = 0.6;

const TOKEN_RE = /[a-z0-9]+/g;

export function tokenize(text: string): Set<string> {
  const matches = text.toLowerCase().match(TOKEN_RE);
  return new Set(matches ?? []);
}

export function jaccardOverlap(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 || b.size === 0) return 0;
  let intersection = 0;
  Array.from(a).forEach((tok) => {
    if (b.has(tok)) intersection++;
  });
  const union = a.size + b.size - intersection;
  return union === 0 ? 0 : intersection / union;
}

export function computeDuplicateFlag(claimText: string, candidates: DuplicateCandidate[], threshold: number = DUPLICATE_OVERLAP_THRESHOLD): DuplicateFlag | null {
  const query = tokenize(claimText);
  if (query.size === 0 || candidates.length === 0) return null;
  let best: DuplicateFlag | null = null;
  for (const candidate of candidates) {
    const score = jaccardOverlap(query, tokenize(candidate.text));
    if (score >= threshold && (!best || score > best.score)) {
      best = { matchId: candidate.id, matchOrigin: candidate.origin, score };
    }
  }
  return best;
}

export interface CounterEvidenceEntry {
  text: string;
}

export function requiresCounterEvidence(fromStage: Stage): boolean {
  return stageAtLeast(fromStage, "internalization");
}

export function normalizeCounterEvidence(raw: unknown): CounterEvidenceEntry[] {
  if (!Array.isArray(raw)) return [];
  const out: CounterEvidenceEntry[] = [];
  for (const entry of raw) {
    if (typeof entry === "string") {
      if (entry.trim()) out.push({ text: entry.trim() });
      continue;
    }
    if (entry && typeof entry === "object" && typeof (entry as { text?: unknown }).text === "string") {
      const text = ((entry as { text: string }).text || "").trim();
      if (text) out.push({ text });
    }
  }
  return out;
}

export function hasCounterEvidence(raw: unknown): boolean {
  return normalizeCounterEvidence(raw).length > 0;
}

export function computeIncentiveEligible(status: string, canonProvenanceSignoff: string | null | undefined): boolean {
  if (status !== "accepted") return false;
  return typeof canonProvenanceSignoff === "string" && /^\s*approved\b/i.test(canonProvenanceSignoff);
}

export interface CorroborationRecord {
  firstSourceId: string;
  secondSourceId: string;
}

export function hasCorroboration(targetNodeId: string, corroborationEvidence: CorroborationRecord[]): boolean {
  return corroborationEvidence.some((c) => c.firstSourceId === targetNodeId || c.secondSourceId === targetNodeId);
}

export type LateralReadingFlag = "single-source" | null;

export function lateralReadingFlag(targetNodeId: string, corroborationEvidence: CorroborationRecord[]): LateralReadingFlag {
  return hasCorroboration(targetNodeId, corroborationEvidence) ? null : "single-source";
}
