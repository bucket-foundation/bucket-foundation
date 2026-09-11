/**
 * Research OS for K-12, the Production provenance guard (bkt-ros,
 * production guard bead). Pure functions, no I/O, matching this
 * directory's own pure/IO split (stages.ts, locate.ts, organize.ts are
 * pure; db.ts and canon-link.ts do the fetching and pass plain data in
 * here). Shared by `/api/research-os/production`'s POST (computed once,
 * at submit time) and `/api/research-os/review`'s GET/POST (read the
 * stored result, recomputed only where the review route's own header
 * says so). Full rule set and what a teacher sees:
 * learning/research-os/PRODUCTION-GUARD.md.
 */
import type { Stage } from "./types";
import { stageAtLeast } from "./types";

// ---------------------------------------------------------------------------
// Rule 1: quote-locator source verification (PRODUCTION-GUARD.md section 1)
// ---------------------------------------------------------------------------

export interface QuoteEvidenceRecord {
  nodeId: string;
  locator: string;
  at: string;
}

export interface SourceCheck {
  /** The source line exactly as the learner typed it (the Production
   * form's "sources, one per line" field, src/app/research-os/workspace/
   * page.tsx): free text, one line per source. */
  text: string;
  verified: boolean;
}

function normalizeForMatch(s: string): string {
  return s.trim().toLowerCase().replace(/\s+/g, " ");
}

/**
 * A source line is verified when its own text carries, verbatim
 * (whitespace/case-normalized), the locator of some real Quote call this
 * learner made (`learner_node_state.evidence`'s own `"quote"`-kind event,
 * `stages.ts`'s `onQuoteReturned`). Matched by substring containment:
 * the workspace's own "sources I have quoted" list renders `citation
 * (locator)`, and a learner who copies that whole line still carries the
 * locator text inside a longer string. A blank source line or a locator
 * that never matches counts as unverified; task item 1's own rule names
 * no other outcome.
 */
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

/** True when ANY source failed verification: production guard, task item
 * 1's own gate, "a Production with any unverified_source cannot reach
 * status accepted." */
export function hasUnverifiedSource(checks: SourceCheck[]): boolean {
  return unverifiedSources(checks).length > 0;
}

/**
 * True when a Production's stored `source_provenance` was never computed
 * against its current `sources` (a mismatched count between the two
 * arrays): checkSourceProvenance maps sourceLines 1:1, so any real submit
 * through /api/research-os/production leaves the two arrays the same
 * length. A stale row can only happen when `source_provenance` came from
 * this migration's own column default (`'[]'::jsonb`) on a production
 * that reached status "submitted" before this guard existed. Task item
 * 1's own rule, "cannot reach accepted through any route," covers a
 * source that was never checked at all the same way it covers one a
 * check explicitly failed; the review route treats stale the same as
 * unverified.
 */
export function isSourceProvenanceStale(sourceLines: string[], checks: SourceCheck[]): boolean {
  return sourceLines.length > 0 && checks.length !== sourceLines.length;
}

/**
 * The starting text for a "returned" decision on a Production carrying an
 * unverified source (task item 1: "only returned with a teacher note
 * template"). A reviewer's own decision still requires a one-line reason
 * (`/api/research-os/review`'s own rule); this is a template a reviewer
 * can send verbatim or edit, never an auto-submitted decision. Empty
 * string when there is nothing to template (no unverified source), so a
 * caller can test truthiness directly.
 */
export function unverifiedSourceReturnNote(checks: SourceCheck[]): string {
  const bad = unverifiedSources(checks);
  if (bad.length === 0) return "";
  const list = bad.map((c) => `"${c.text}"`).join(", ");
  return (
    `Returned: ${bad.length} source${bad.length === 1 ? "" : "s"} could not be matched to a Quote call you made in the workspace ` +
    `(${list}). Use the Quote tool on each source you cite, then include the locator it returns in your sources list, and resubmit.`
  );
}

// ---------------------------------------------------------------------------
// Rule 2: duplicate detection, normalized token overlap (PRODUCTION-GUARD.md
// section 2). Same lexical-Jaccard approach tools/hypothesis-engine/hte/
// novelty.py already uses for the engine's own write-back path, ported to
// TypeScript rather than shared across languages: no external model, no
// network, deterministic, and no stop words dropped (two unrelated claims
// sharing only common function words still read as some overlap, never
// zero, the same reason novelty.py reports a continuous score).
// ---------------------------------------------------------------------------

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

/** Above this normalized-token-overlap score, a match writes a
 * duplicate_flag (task item 2). A reviewer's own read of the flagged pair
 * decides what it means; this threshold only decides when that read is
 * worth asking for. */
export const DUPLICATE_OVERLAP_THRESHOLD = 0.6;

const TOKEN_RE = /[a-z0-9]+/g;

export function tokenize(text: string): Set<string> {
  const matches = text.toLowerCase().match(TOKEN_RE);
  return new Set(matches ?? []);
}

/** `|a & b| / |a | b|`. 0 when either set is empty, never NaN. */
export function jaccardOverlap(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 || b.size === 0) return 0;
  let intersection = 0;
  // Array.from + forEach here: this repo's ts-node run targets a lib
  // level that refuses direct `for...of` iteration over a Set without
  // --downlevelIteration (see scripts/test-research-os-production-
  // guard.ts's own run command).
  Array.from(a).forEach((tok) => {
    if (b.has(tok)) intersection++;
  });
  const union = a.size + b.size - intersection;
  return union === 0 ? 0 : intersection / union;
}

/**
 * The single closest candidate whose overlap score clears `threshold`,
 * or null when there are no candidates, the claim tokenizes to nothing,
 * or every candidate scored below threshold. Never blocks submission on
 * its own (task item 2's own rule); the caller only stores the result
 * for a reviewer to read in the queue.
 */
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

// ---------------------------------------------------------------------------
// Rule 3: counter-evidence, required at the internalization tier
// (PRODUCTION-GUARD.md section 3, Osborne 2010's argumentation case)
// ---------------------------------------------------------------------------

export interface CounterEvidenceEntry {
  text: string;
}

/**
 * True once the learner's own stage, at the moment of submission
 * (`fromStage` on the `production_submitted` evidence event, `stages.ts`'s
 * `onProductionSubmitted`), had already reached Internalization
 * (`STAGE_ORDER`'s fourth stage, reached only after a teacher-approved
 * transfer item). Osborne 2010's own case for counter-evidence, defending
 * a claim against a challenge is where the reasoning benefit lives, only
 * applies once a claim has survived that far; a Production submitted
 * earlier (Phase 0 allows submission from any stage, `onProductionSubmitted`
 * gates on nothing) stays exempt, since counter-evidence is optional in
 * Phase 0 outside this one tier.
 */
export function requiresCounterEvidence(fromStage: Stage): boolean {
  return stageAtLeast(fromStage, "internalization");
}

/** A learner-supplied `counterEvidence` value, tolerant of a bare string
 * array (`["text", ...]`) or an already-shaped `{text}[]`; anything else,
 * including a blank entry, is dropped rather than stored as noise. */
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

// ---------------------------------------------------------------------------
// Rule 4: citation-incentive eligibility (PRODUCTION-GUARD.md section 4).
// No payment code here or anywhere this bead touches (task item 4's own
// scope line): this computes the eligibility SIGNAL only.
// ---------------------------------------------------------------------------

/**
 * True only once a Production is accepted AND the canon record its target
 * node is linked to (`graph.nodes.provenance.paper_id`, the link
 * `scripts/research-os/ingest/canon-import.ts` already writes) carries a
 * raw `provenance_signoff` value starting with "approved", GOVERNANCE.md's
 * own "Canon sign-off" rule: "Approval is the named approver replacing a
 * `pending: <name>` value with their own confirmation." A pending,
 * rejected, missing-signoff, no-canon-link, or still-submitted Production
 * is never eligible. This is a stricter read than
 * `src/lib/canon-primary.ts`'s own `isPendingSignoff` gate (which also
 * treats a record with NO `provenance_signoff` field at all as
 * already-vetted, for backward compatibility with pre-ros-11 records):
 * an incentive-eligibility signal requires an explicit, named approval,
 * a positive signal past the absence of a rejection.
 */
export function computeIncentiveEligible(status: string, canonProvenanceSignoff: string | null | undefined): boolean {
  if (status !== "accepted") return false;
  return typeof canonProvenanceSignoff === "string" && /^\s*approved\b/i.test(canonProvenanceSignoff);
}

// ---------------------------------------------------------------------------
// Rule 5: lateral-reading corroboration flag (bkt-ros, PLAN-REVISION-3.md
// section 2c; learning/research-os/LATERAL-READING.md). Informational
// only, the same "never blocks submission" posture duplicate detection
// already carries: a Production whose target node carries no
// corroboration record (stages.ts's onCorroborationRecorded, a learner
// who attached a real, independent second Quote before Check revealed)
// reads "single-source" for a reviewer to see, the same read
// checkSourceProvenance already gives for an unverified quote.
// ---------------------------------------------------------------------------

export interface CorroborationRecord {
  firstSourceId: string;
  secondSourceId: string;
}

/** True once at least one corroboration record names `targetNodeId` as
 * either its first or second source: a learner may have run the
 * lateral-reading step from either side (the node under Check, or the
 * independent source Locate's "find another source" mode surfaced), and
 * this flag reads either direction as "corroborated." */
export function hasCorroboration(targetNodeId: string, corroborationEvidence: CorroborationRecord[]): boolean {
  return corroborationEvidence.some((c) => c.firstSourceId === targetNodeId || c.secondSourceId === targetNodeId);
}

/** The guard flag this rule adds: `"single-source"` when no corroboration
 * record backs this Production's target node, `null` otherwise.
 * Informational only, matching duplicate detection's own "never blocks"
 * rule: a reviewer reads it, nothing here refuses an accept decision the
 * way hasUnverifiedSource does. */
export function lateralReadingFlag(targetNodeId: string, corroborationEvidence: CorroborationRecord[]): "single-source" | null {
  return hasCorroboration(targetNodeId, corroborationEvidence) ? null : "single-source";
}
