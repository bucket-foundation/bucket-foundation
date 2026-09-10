/**
 * Research OS for K-12, canon-and-corpus ingestion (bkt-ros, ingestion
 * slice). Shared types between the two importers
 * (src/lib/research-os/ingest/academy.ts, .../canon.ts), their shared
 * validators (.../validate.ts), and the CLI scripts that read a source,
 * call an importer, and either preview or write the result
 * (scripts/research-os/ingest/*.ts).
 *
 * Every draft here mirrors graph.nodes / graph.edges
 * (supabase/migrations/20260910000000_research_os_graph.sql), but keyed by
 * `slug` rather than a database id: an importer never talks to Postgres
 * directly, so it stays unit-testable with plain fixtures, matching
 * src/lib/research-os/frontier.ts and engine-bridge.ts's own
 * "dependency-free" convention. A CLI script resolves slugs to ids at write
 * time, the same two-step upsert-then-link scripts/seed-research-os.mjs
 * already does for the sky-blue seed.
 */

import type { EdgeKind, NodeKind } from "../types";

export interface IngestNodeDraft {
  slug: string;
  title: string;
  kind: NodeKind;
  /** graph.nodes.tier: a plain smallint. See academy.ts / canon.ts for the
   * two tier heuristics this ingestion slice defines. */
  tier: number;
  branch: string;
  summary: string | null;
  /** i18n labels, graph.nodes.labels's own shape: {"en": {"title": "..."}}. */
  labels: Record<string, { title?: string; summary?: string }>;
  provenance: Record<string, unknown>;
}

export interface IngestEdgeDraft {
  fromSlug: string;
  toSlug: string;
  kind: EdgeKind;
  weight?: number | null;
  provenance?: Record<string, unknown>;
}

export type ReviewItemKind =
  /** A canon entry's `derives_from` target could not be resolved by slug
   * match or by canon-atom-map.json, and was left unset rather than guessed. */
  | "unmatched_derives_from"
  /** canon-atom-map.json names a (branch, atom_id) pair that does not
   * resolve to any Academy atom the importer loaded. */
  | "unresolved_map_entry"
  /** A `prerequisite` edge whose source node's tier is greater than its
   * target node's tier (task item 3's monotonicity check). */
  | "tier_violation"
  /** An Academy atom's `requires` list named an id the importer could not
   * resolve within the same source file (never observed against the
   * current 487-atom corpus; guarded for defensively rather than assumed
   * impossible). */
  | "unresolved_requires"
  /** A `requires` cycle within one source file's atoms. Cyclic atoms fall
   * back to the tier base rather than an unbounded topological depth. */
  | "prerequisite_cycle";

export interface ReviewItem {
  /** Stable across re-runs: (kind + the item's own natural key), so
   * scripts/research-os/ingest/out/review-list.json converges instead of
   * growing a duplicate row every run (mergeReviewList in review.ts). */
  id: string;
  kind: ReviewItemKind;
  note: string;
  detail: Record<string, unknown>;
}

export interface IngestResult {
  nodes: IngestNodeDraft[];
  edges: IngestEdgeDraft[];
  reviewList: ReviewItem[];
  stats: Record<string, number>;
}

/** Turns a free-text segment into a URL/slug-safe token: lowercase,
 * non-alphanumeric runs collapsed to one hyphen, trimmed of leading/
 * trailing hyphens. Mirrors engine-bridge.ts's own `slugifyPart`, kept as
 * a second copy here (rather than exported/shared from engine-bridge.ts)
 * since that module is other agents' concurrently-edited territory this
 * slice must not import from or touch. */
export function slugifyPart(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}
