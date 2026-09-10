# Research OS for K-12, Deletions Log

Every place Phase 0 build work replaced existing copy, with the original text
kept verbatim below. No file is ever deleted outright; this log exists so a
replaced sentence is never lost. See also
`learning/research-os/CHANGE-LEDGER.md`, PR #3's own ledger for the same
convention.

## 2026-09-10, `src/app/research-os/page.tsx`

**Reason.** The system review (`RESEARCH-OS-K12-SYSTEM-REVIEW.md` sections 8
and 12) recommends `02-physics`, grades 3-5, the "why is the sky blue" path as
the Phase 0 slice, and section 11 lists the choice of slice as an open
question only the founder can answer ("Is `02-physics` grades 3-5 ... the
right Phase 0 slice, or does a different branch or a different question
better demonstrate the product?"). PR #3's own `learning/research-os/PLAN.md`
section 8 answered that open question differently, picking the history of
quantum physics, grades 9-12, as its Phase 0 scope. This build (Phase 0
prototype: graph schema, seed data, routing, workspace) was scoped by the
orchestrating task to follow the system review's explicit recommendation, not
PLAN.md's choice, so the shipped code is the sky-is-blue path. The site page's
status paragraph named the quantum-history slice as what Phase 0 "covers,"
which no longer matched the code once this build landed; the paragraph was
updated to describe the path this PR ships and to flag the slice choice as
still open, rather than silently overwriting PLAN.md's own decision.

`learning/research-os/PLAN.md` itself is untouched by this PR; its Phase 0
row (quantum-history) stands as the record of that planning decision. The
review's section 11 open question is still open: which slice best
demonstrates the product is a founder call, not one this PR makes for good.

**Original text, replaced in the "§ status" paragraph:**

> Design, iteration 1, September 2026. Phase 0 covers the history of
> quantum physics for grades 9 to 12, the corpus the hypothesis engine
> already reads. The plan, the learner-state model, the production
> schema, the vendor and data-source map, and the funding and people map
> are public in the repository under `learning/research-os/` and
> `_intake/research-os-k12/`. Pilot classrooms, a pre-registered study of
> the four-tool constraint, and a state-validation paper come before any
> wider release.

## 2026-09-10, PR #6 review pass, voice-lint word and construction swaps

**Reason.** `agf-lint-voice` / `agf-lint-voice-src check` flagged a banned
adverb in two files and an antithesis construction in three files. Each
swap is a single word or short phrase; the original wording is kept here
verbatim rather than only in the diff.

- `_intake/research-os-k12/DELETIONS.md` (this file's own opening
  paragraph): "this log exists so a replaced sentence is never **actually**
  lost" to "never lost."
- `src/app/api/research-os/workspace/route.ts` (Check tool system prompt):
  "and only if you **actually** leaned on it" to "and only if you leaned on
  it."
- `scripts/seed-research-os.mjs` (header comment): "but the destination
  here is Postgres, **not a static file mirror, since the graph is
  server-queried, not shipped to the browser**." to "with Postgres as the
  destination: the graph is server-queried at request time."
- `scripts/test-research-os-routing.ts` (assertion message): "the chain must
  report the learner's real stage, **not silently upgrade it**" to "the
  chain must report the learner's recorded stage as-is."
- `src/app/research-os/workspace/page.tsx` (transfer-item prompt): "A sunset
  looks red, **not blue**. Using the lambda^-4 law, explain why the SAME
  scattering that makes the daytime sky blue makes a sunset red." to "A
  sunset looks red. Using the lambda^-4 law, explain why the SAME
  scattering that makes the daytime sky blue makes a sunset red instead."

## 2026-09-10, `src/lib/research-os/engine-bridge.ts`, task item 3 rebuilt against PR #10

**Reason.** This WIP commit's own "Direction 2" section hand-built the
engine's `PRODUCTION-SCHEMA.md` JSON envelope (`claims`/`evidence`/`review`
blocks) from a `graph.productions` row, in TypeScript, before posting it to
an outbox table. PR #10 (`feat/hte-k12-research-os`, merging concurrently)
landed `hte.corpus.production.is_research_os_record` and
`normalize_research_os_record` (`tools/hypothesis-engine/hte/corpus/
production.py`): the engine now detects a raw `graph.productions` row on
sight (fingerprint: a `target_node_id` field, no `claims` field) and builds
that exact envelope itself, server-side, in Python, with a more accurate
mapping than this file's own simplification (PR #10's normalizer reads
`sources` for a `doi` to pick `"T2"` vs `"T4"`; this code defaulted every
evidence entry to `"T4"` regardless). Hand-building the same envelope a
second time, client-side, would duplicate that mapping with a strictly
worse version of it. The outbox item 3 ships instead writes the RAW
`graph.productions` row (plus an optional `_target_node` join), the shape
PR #10's own normalizer already reads directly; see `learning/research-os/
ENGINE-BRIDGE.md`, "Why the outbox carries the raw row."

`GraphProductionRow` and `productionEnvelopeId` (renamed, simplified, no
longer prefix-mangled since the outbox row's own `id` is the production's
real id) carry forward into the replacement code; everything else below is
dropped.

**Original text, `src/lib/research-os/engine-bridge.ts` lines 186-317 (the
whole "Direction 2" section, verbatim):**

```typescript
// ---------------------------------------------------------------------------
// Direction 2: an accepted Research OS production -> the engine's own
// PRODUCTION-SCHEMA.md envelope (task item 3)
// ---------------------------------------------------------------------------

/** The shape one `graph.productions` row carries (the Phase 0 migration's own columns). */
export interface GraphProductionRow {
  id: string;
  learner_id?: string;
  target_node_id: string;
  claim: string | null;
  evidence: unknown[];
  sources: unknown[];
  transfer_proof: Record<string, unknown>;
  status: string;
  created_at: string;
  updated_at?: string;
}

export interface ProductionEnvelopeEvidence {
  source_id: string;
  locator: string;
  quote: string;
  kind: string;
  tier: string;
  citations: Array<{ type: string; value: string }>;
}

export interface ProductionEnvelopeClaim {
  text: string;
  stance: "supports" | "refutes" | "extends";
  slots: { actor: string | null; action: string | null; object: string | null; place: string | null; mechanism: string | null };
  interval: null;
  evidence: ProductionEnvelopeEvidence[];
}

/** The exact JSON shape `tools/hypothesis-engine/docs/PRODUCTION-SCHEMA.md` defines and
 * `hte.corpus.production.Production.from_dict` reads. */
export interface ProductionOutboxEnvelope {
  id: string;
  created_at: string;
  author_role: string;
  grade_band: string;
  school_or_district_id: string;
  research_question: string;
  claims: ProductionEnvelopeClaim[];
  review: { status: "accepted"; history: Array<{ status: string; date: string }> };
  provenance: string;
}

const PRODUCTION_ENVELOPE_ID_PREFIX = "ros-";

/**
 * `graph.productions.id` (a UUID) has no fixed relationship to the engine's
 * own fixture ids (`prod-001`, ...), a `ros-` prefix keeps the two id spaces
 * from ever colliding. Deterministic, so re-deriving it from the same
 * `graph.productions.id` twice is the idempotency key `writeProductionOutbox`
 * upserts on.
 */
export function productionEnvelopeId(graphProductionId: string): string {
  return `${PRODUCTION_ENVELOPE_ID_PREFIX}${graphProductionId}`;
}

/** The tier every mapped evidence entry carries: `hte.evidence.Tier` reads a K-12
 * production's own evidence, unreviewed by a domain scientist, one step more derived
 * than a peer-reviewed source, the same rung `RESEARCH-OS-INTEGRATION.md`'s own
 * `hypothesize_result` example gives a self-report citation ("T3") one notch down
 * from, since a learner's own quote has had no calibration pass run over it at all. */
export const PRODUCTION_EVIDENCE_DEFAULT_TIER = "T4";

function coerceEvidenceEntry(raw: unknown, index: number): ProductionEnvelopeEvidence {
  const record = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  const sourceId =
    (typeof record.source_id === "string" && record.source_id) ||
    (typeof record.node_id === "string" && record.node_id) ||
    `unspecified-source-${index}`;
  const locator = typeof record.locator === "string" ? record.locator : "";
  const quote = typeof record.quote === "string" ? record.quote : "";
  return { source_id: sourceId, locator, quote, kind: "textual", tier: PRODUCTION_EVIDENCE_DEFAULT_TIER, citations: [] };
}

/**
 * An accepted `graph.productions` row, as the envelope `writeProductionOutbox`
 * writes to `public.research_os_productions_outbox` (task item 3). Throws if
 * `production.status` is not `"accepted"`, this function is the write-side
 * hook itself, called only at the point a production's status becomes
 * accepted, never speculatively.
 *
 * Mapping decisions, each a documented simplification rather than a silent
 * guess (learning/research-os/ENGINE-BRIDGE.md carries the full rationale):
 * - `author_role` is fixed `"student"`: every Phase 0 production is learner-authored.
 * - `grade_band`/`school_or_district_id` are `"unspecified"`: Phase 0 tracks neither
 *   on a production or a learner yet (task item 6, no roster).
 * - `research_question` is synthesized from the target node's own title, `graph.
 *   productions` carries no dedicated field for it.
 * - The one claim's `stance` defaults to `"supports"` and every slot reads `null`
 *   ("not asserted"): Phase 0's Production form (task item 4) collects a claim,
 *   evidence, and sources, not a stance or slot block.
 * - `review.history` collapses to the single `"accepted"` transition it is called
 *   on: Phase 0 has no review ladder to log the intermediate steps of (task item 6).
 */
export function buildProductionEnvelope(
  production: GraphProductionRow,
  targetNode: { title: string },
): ProductionOutboxEnvelope {
  if (production.status !== "accepted") {
    throw new Error(`buildProductionEnvelope: production ${production.id} is not accepted (status=${production.status})`);
  }
  const evidence = Array.isArray(production.evidence) ? production.evidence.map(coerceEvidenceEntry) : [];
  const acceptedAt = production.updated_at ?? production.created_at;

  return {
    id: productionEnvelopeId(production.id),
    created_at: production.created_at,
    author_role: "student",
    grade_band: "unspecified",
    school_or_district_id: "unspecified",
    research_question: `Research OS production toward: ${targetNode.title}`,
    claims: [
      {
        text: production.claim ?? "",
        stance: "supports",
        slots: { actor: null, action: null, object: null, place: null, mechanism: null },
        interval: null,
        evidence,
      },
    ],
    review: { status: "accepted", history: [{ status: "accepted", date: acceptedAt }] },
    provenance: "research-os-phase0",
  };
}
```
