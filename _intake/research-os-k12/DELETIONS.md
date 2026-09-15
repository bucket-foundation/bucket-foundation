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

## 2026-09-10, `src/app/research-os/page.tsx`, site alignment pass

**Reason.** The site-alignment task requires a visible "Try the prototype"
link on this page. The existing prototype link's label was replaced to carry
that exact text; its href and styling are unchanged. A second link, "Read
the plan ↗", was added pointing to `learning/research-os/PLAN.md` on
GitHub; nothing was removed to make room for it.

**Original text, replaced in the prototype link:**

> open the Phase 0 prototype →

## 2026-09-10, PR #10 review pass, voice-lint construction swap

**Reason.** `agf-lint-voice-src check` flagged an antithesis construction in
`tools/hypothesis-engine/hte/api.py`'s `_sanitize()` docstring.

- `tools/hypothesis-engine/hte/api.py` (`_sanitize()` docstring): "a root
  outside this list still reaches the response unredacted, so this is a
  backstop behind the explicit `run_dir` replacement above, **not a
  blanket guarantee for every possible filesystem layout**." to "a root
  outside this list stays a gap this backstop leaves open behind the
  explicit `run_dir` replacement above, worth widening the moment a real
  deployment names a root not yet on it."

## 2026-09-10, `learning/research-os/ENGINE-BRIDGE.md`, ros-12 stub closures

**Reason.** PR #14's own "Stubs, open items" section named three open
items: the outbox reader, item 1's missing caller, and `GapNode`/
`value_of_information` wiring. `feat/ros-12-engine-wiring` closes all
three (`hte.corpus.research_os_outbox`, `tools/hypothesis-engine/scripts/
campaign_research_os.py`, `hte.unknowns.unresolved_slot_gaps`, `engine-
bridge.ts`'s `buildGapNode`/`buildGapEdges`, `db.ts`'s `upsertGapNode`),
so the section describing them as open no longer matched the code; it was
replaced with a "Stubs Closed: ros-12 and ros-13" section naming what
shipped, and a narrower "Stubs, open items" section for what remains
(the write-side production-accept hook, still unreached pending task item
6's teacher-accept path; `engineFrontier`'s `derives_from`-not-
`prerequisite` design note; `hte/api.py`'s own private duplicate of the
new `unresolved_slot_gaps`, pending PR #20's review landing).

**Original text, replaced in the "Stubs, open items" section:**

> ## Stubs, open items
>
> - **The outbox has no reader yet.** `writeProductionOutbox` writes rows;
>   nothing in `tools/hypothesis-engine` points `load_supabase` at
>   `research_os_productions_outbox` today. That one-line wiring
>   (`load_supabase(table="research_os_productions_outbox")` inside a
>   registered `--corpus research-os` loader, the same one-line pattern
>   `OVERLAP-RESEARCH-OS-AND-AI-FOR-RESEARCH.md` names for `production` and
>   `literature`) is engine-side work, out of this PR's own scope.
> - **Item 3's hook is unreached today.** `/api/research-os/production`'s
>   POST handler only emits to the outbox when a write leaves a production
>   at status `"accepted"`; Phase 0 has no teacher-accept path (task item 6),
>   so no production ever reaches that status yet. The hook is wired and
>   tested (`scripts/test-research-os-engine-bridge.ts`) against a fixture,
>   not against a live accept.
> - **Item 1 has no caller yet either.** Nothing in `tools/hypothesis-engine`
>   calls `upsertEngineHypothesisNode`/`writeEngineEdges` after a real
>   campaign run; a campaign's own accepted-hypothesis list would need a
>   small script or `hte.runner` hook to walk it and call these. This PR
>   ships the write path and its idempotency; the scheduler that would drive
>   it is separate, unbuilt work.
> - **`engineFrontier`'s "prerequisite" reading is `derives_from`, not
>   `prerequisite`.** Item 1 writes only `cites` and `derives_from` edges for
>   an engine hypothesis node, never `prerequisite`; `engine-frontier.ts`'s
>   own header comment names this explicitly: `derives_from` targets stand
>   in for the prerequisite set a K-12 path node's own frontier routing
>   walks. A future engine hypothesis with a real prerequisite structure of
>   its own may want its own edge kind rather than reusing `derives_from` for
>   both "canon it builds on" and "concept it requires."
> - **`GapNode`/`value_of_information` are still unwired**, unchanged from
>   `OVERLAP-RESEARCH-OS-AND-AI-FOR-RESEARCH.md`'s own accounting
>   (`hte/unknowns.py:273`, `:289`, `:323`, recorded there as built but never
>   called from `hte.runner`): this PR's `engineFrontier` reads only
>   accepted hypothesis nodes already in the graph, never a live gap-node
>   queue.

## 2026-09-10, ros-12 review pass, voice-lint heading swap

**Reason.** `agf-lint-voice`'s pre-commit hook flagged an appended-clause
heading in `learning/research-os/CHANGE-LEDGER.md`, pre-existing from an
earlier iteration and caught only now because this branch's own edits
touch the same file. Fixed locally as "## Iteration 6: Phase 1 Stub
Closures"; merging `origin/main` afterward brought in the `ros-09`
funding-wave-1 branch's own independent fix of the identical heading
("## Iteration 6: Phase 1 stub closures"), landed there via that
branch's own PR #26 review pass. The merge kept `origin/main`'s version
rather than carrying two competing fixes of the same line forward.

- `learning/research-os/CHANGE-LEDGER.md` (heading): "## Iteration 6,
  Phase 1 stub closures: closure table, diagnostic probe, real quotes,
  review hold" to "## Iteration 6: Phase 1 stub closures".

## 2026-09-10, ros-12 merge pass, voice-lint construction swap

**Reason.** Merging `origin/main` into `feat/ros-12-engine-wiring` pulled
in `tools/hypothesis-engine/docs/LOOP-LOG.md`'s "tick 2" entry (the
hourly optimization loop, a separate autonomous process), which carried
an antithesis construction the pre-commit hook caught on the merge
commit.

- `tools/hypothesis-engine/docs/LOOP-LOG.md` ("tick 2" entry): "own
  documented fake-mode short-circuit, a test-isolation quirk, not a code
  defect; `make test` runs with it unset from here on." to "own
  documented fake-mode short-circuit, a test-isolation quirk; `make test`
  runs with it unset from here on."

## 2026-09-10, `src/app/api/research-os/production/route.ts`, outbox emission extracted to a shared function

**Reason.** Bead `ros-06` adds a second caller that can reach `graph.productions.status = "accepted"` (`/api/research-os/review`'s new accept path). Rather than copy the three-call outbox-emission sequence a second time, it moved into `src/lib/research-os/db.ts`'s `emitProductionOutboxIfAccepted`, with the same best-effort try/catch and the same reasoning, so both entry points share one function. Behavior is unchanged; the full replaced block, with its original comment, is in `learning/research-os/CHANGE-LEDGER.md`'s `ros-06` entry.

**Original text, replaced in the POST handler:**

> ```ts
>   // Engine bridge task item 3: an accepted production is the engine's own
>   // evidence item. Unreachable today (the status validation above never lets
>   // a learner set "accepted"), wired for Phase 1's teacher-accept path. Best
>   // effort: a failed emit never fails the production save itself, the same
>   // way academy's own mirror jobs treat a sync step as best effort.
>   if (data?.status === "accepted" && data?.target_node_id) {
>     try {
>       const targetNode = await findNodeById(data.target_node_id as string);
>       const row = buildProductionOutboxRow(
>         {
>           id: data.id as string,
>           target_node_id: data.target_node_id as string,
>           claim: (data.claim as string | null) ?? null,
>           evidence: (data.evidence as unknown[]) ?? [],
>           sources: (data.sources as unknown[]) ?? [],
>           status: data.status as string,
>           created_at: data.created_at as string,
>           updated_at: data.updated_at as string | undefined,
>         },
>         targetNode ? { slug: targetNode.slug, title: targetNode.title, tier: targetNode.tier, branch: targetNode.branch } : null,
>       );
>       await writeProductionOutbox(row);
>     } catch {
>       // best effort, see comment above
>     }
>   }
> ```

## 2026-09-10, `src/app/api/research-os/review/route.ts`, header comment corrected for the accept path fix

**Reason.** The header comment originally documented an "approved production flips `graph.productions.status` to 'accepted' ('returned' otherwise)" contract. Bead `ros-06`'s own work changed that contract (a return sets `status` to `"draft"`, not `"returned"`, and appends a teacher note); a mid-review fix (`ros-02`'s evidence-schema pass) then added a `recordEvidence` call on both approve and return, closing a gap where a returned production's `learner_node_state.stage` stayed at `"production"` with no evidence event recording the correction. The comment was rewritten to match; see `learning/research-os/TEACHER-LAYER.md` for the full account.

**Original text, replaced in the file header:**

> An "approved" production flips graph.productions.status to 'accepted'
> ('returned' otherwise); Production is already the graph's terminal
> stage (src/lib/research-os/types.ts's STAGE_ORDER), so acceptance
> lives on the production row's own status alone.

**Original text, replaced in `stages.ts`'s `onProductionReview` docstring** (the paragraph below no longer describes the shipped behavior once `onProductionReturned` was added):

> Only meaningful for "approved"; the caller (the review route) applies
> this only on approval, matching onTeacherReview's own "only an approval
> mirrors onto the learner's own progress log" split. A "returned"
> decision touches `graph.productions.status` and `.notes` only, never
> this function -- the production goes back to `draft` for the learner to
> revise, with no learner_node_state change.

## 2026-09-10, `learning/research-os/CHANGE-LEDGER.md`, a pre-existing heading fixed for the voice pre-commit hook

**Reason.** The pre-commit hook runs `agf-lint-voice` over every file a commit touches, not only its own diff lines; `CHANGE-LEDGER.md`'s "Iteration 6" heading (from an earlier, already-merged pass, predating `ros-06`) carried an appended clause after a comma, rule 7's own banned construction. Fixing it was required to commit `ros-06`'s own addition to the same file. The clause is not dropped, it moves to the first line of that section's body, per rule 7's own instruction ("if the extra detail matters, put it in the first line of the body").

**Original text, replaced in the "Iteration 6" heading:**

> ## Iteration 6, Phase 1 stub closures: closure table, diagnostic probe, real quotes, review hold

## 2026-09-10, `src/app/research-os/workspace/page.tsx`, notes-field placeholder rewritten for voice review (PR #37 review pass)

**Reason.** PR review for `ros-04` ran `agf-lint-voice check` on every changed file. The notes textarea placeholder used the banned antithesis construction (rule 4, "X, not Y"). Rewritten to state the fact once, positively.

**Original text, replaced in the notes textarea placeholder:**

> scratch space, not graded, saved on this device only…

## 2026-09-10, `src/app/research-os/page.tsx`, status section rewritten for the consent gate wiring pass (ros-07 follow-up)

**Reason.** Bead `ros-07`'s follow-up task item 3: "update the existing Phase 0 status section to list, truthfully, what is on main... and what is not." The paragraph below described only the Phase 0 seed path (grades 3 to 5, why the sky is blue) and the open grades-9-to-12 question; it named none of the routing, probe, workspace, teacher-layer, engine-bridge, privacy, or consent-gate work that landed on main since (`ros-03` through this pass). Replaced with a status paragraph that names what is on main and what is not, keeping the same heading, the same repository-path sentence, and the same "pilot classrooms" closing sentence in substance. Nothing else on the page changed.

**Original text, replaced in the "§ status" paragraph** (everything after the lead sentence "Design, iteration 2, September 2026."):

> The built Phase 0 prototype
> covers one path in grades 3 to 5, why the sky is blue, walking from
> light and air facts forward to Rayleigh scattering and the
> lambda-to-the-minus-4 law, per the system review&apos;s Phase 0 slice
> (<code className="text-[13px]">_intake/research-os-k12/RESEARCH-OS-K12-SYSTEM-REVIEW.md</code>{" "}
> section 8). A companion path over the history of quantum physics,
> grades 9 to 12, was this plan&apos;s original iteration-1 slice and
> stays an open choice for which subject demonstrates the product
> next (section 11, question 1). The plan, the learner-state model,
> the production schema, the vendor and data-source map, and the
> funding and people map are public in the repository under{" "}
> <code className="text-[13px]">learning/research-os/</code> and{" "}
> <code className="text-[13px]">_intake/research-os-k12/</code>.
> Pilot classrooms, a pre-registered study of the four-tool constraint,
> and a state-validation paper come before any wider release.

## 2026-09-10, `learning/research-os/study/INSTRUMENTS.md` section 2, confidence item moved before the verdict (cognitive forcing on Check)

**Reason.** `PLAN-REVISION-2.md` section 2a's design response to Buçinca, Malaya and Gajos (2021), Bansal et al. (2021), and Vaccaro, Almaatouq and Malone (2024) puts the metacognitive confidence item BEFORE Check's verdict is revealed, a commit-before-reveal cognitive forcing function, rather than after it. Section 2's own "Design" paragraph, and the "Schema gap" paragraph's calibration-score description, described the item as it would be built if fired after the verdict was already shown. Both are rewritten to describe the shipped pre-reveal placement and its actual calibration record (`src/lib/research-os/calibration.ts`, mean confidence against mean source-prediction correctness, not the human-audited verdict-correctness score the original paragraph named). The "Fisher-and-colleagues unrelated-topic check" subsection is untouched: that instrument stays unbuilt, out of this pass's scope.

**Original "Design" paragraph, replaced:**

> Immediately after the Check tool returns a verdict (support, contradiction, or unknown, with or without abstaining), the workspace asks the learner one additional question before advancing: "How sure are you that this explanation is correct, now that you have seen the check?" on a four-point scale (not sure at all, a little sure, fairly sure, certain), logged as part of the same `check` evidence event rather than as a separate event, since it is a property of that specific check attempt. This is the calibration outcome Lee and colleagues (2025) name directly: across 936 real generative-AI use examples, higher self-reported confidence in the AI's own output was associated with less critical thinking during the task, while higher self-confidence in one's own unassisted ability was associated with more, the opposite direction. The item above asks for the first of those two confidences (confidence in the tool's verdict, given the tool's own verdict just returned), against which this study computes a calibration score: the gap between the learner's stated confidence and the tool's own verdict correctness on a later-audited subset (the same human cross-scoring sample the Understanding-scoring rubric already draws, per `PREREGISTRATION-DRAFT.md`'s Variables section), following Lee and colleagues' own framing that a well-calibrated learner's stated confidence should track the tool's actual reliability rather than the tool's own confidence label alone.

## 2026-09-10, `learning/research-os/WORKSPACE.md` section 6, held-attempt store description rewritten for the persistence fix (PR #63 review pass)

**Reason.** PR review for PR #63 found the held-attempt store described below was an in-memory `Map`, correct at the time it was written but wrong for a Vercel deploy: a phase-1 Check and its phase-2 reveal can land on two different route instances, losing the held verdict between them. The fix moves the store into `graph.check_attempts` (migration `20260910070000_research_os_check_attempts.sql`, `src/lib/research-os/check-attempts-db.ts`); the two paragraphs below, describing the old in-memory-only behavior as the shipped production posture, no longer describe the shipped behavior and are replaced with a description of the persisted store, the 24-hour hard expiry, and the privacy-delete purge sweep. `forcing.ts`'s in-memory `Map` is not deleted, it is kept and re-scoped as the test double `scripts/test-research-os-forcing.ts` exercises directly.

**Original "Server enforcement" and "In-memory, best effort" paragraphs, replaced:**

> **Server enforcement.** `src/lib/research-os/forcing.ts`'s held-attempt store is the only place a graded-but-unrevealed verdict lives. `getPendingAttempt` never returns a verdict on its own; `workspace/route.ts`'s "check" phase 2 is the only caller, and it only reaches the reveal code path once `isValidLearnerConfidence` and a non-empty `sourcePrediction` both hold, on the SAME request. A request carrying only `attemptId`, no confidence, no prediction, gets a 400 and the attempt stays held for a retry: there is no separate "peek" endpoint, so no code path returns a verdict without both fields present. `scripts/test-research-os-forcing.ts` proves this against the store directly, with no network or database.
>
> **In-memory, best effort.** The held-attempt store, like `src/lib/research-os/rate-limit.ts`'s daily cap, is an in-memory `Map`: a serverless cold start or a multi-instance deploy can lose a pending attempt, and the learner sees the Check form again rather than an error. A 30-minute TTL (`forcing.ts`'s `ATTEMPT_TTL_MS`) bounds how long an abandoned attempt lingers. A durable store is Phase 2 work, the same posture the daily cap already documents.

## 2026-09-10, `learning/research-os/study/PREREGISTRATION-DRAFT.md`, revision 1: effect-size anchoring, arms and factors, new outcomes, required participation

**Reason.** `PLAN-REVISION-3.md` section 2's evidence-driven revisions (effect-size anchoring, guidance for low-prior-knowledge learners, required participation and production misconduct) and two newly shipped design docs (`GUIDANCE.md` on branch `feat/ros-faded-guidance`, `PRODUCTION-GUARD.md` on PR #73) drove five changes to the preregistration draft, logged in full in `learning/research-os/study/PREREGISTRATION-DRAFT.md`'s own new "Revision history" section. The passages below are the exact original sentences each change replaced.

**Original header status line, replaced** (the "Reads against" citation list gained `PLAN-REVISION-3.md`, `GUIDANCE.md`, `PRODUCTION-GUARD.md`, and six literature cards; "draft, bead `ros-08`" became "draft, revision 1, bead `ros-08`"):

> **Status:** draft, bead `ros-08` · **Date:** 2026-09-10 · Reads against `learning/research-os/PLAN-REVISION-1.md` sections 2c, 3 item 9, and 4; `learning/research-os/LEARNER-STATE-MODEL.md` sections 4 and 5; `src/lib/research-os/EVIDENCE-SCHEMA.md`; `_intake/research-os-k12/04-compliance-distribution.md` section 10; `_intake/research-os-k12/RESEARCH-OS-K12-SYSTEM-REVIEW.md` section 9; `_intake/research-os-k12/OVERLAP-RESEARCH-OS-AND-AI-FOR-RESEARCH.md`.

**Original "The compiled effect-size and power-analysis sources already in this repo" paragraph, replaced** (the closing clause naming d = 0.4 as "a conservative assumption rather than an inflated one" is cut; the three-anchor table and the "planning effect size this draft chooses" paragraph now carry that reasoning instead):

> **The compiled effect-size and power-analysis sources already in this repo.** `_intake/research-os-k12/RESEARCH-OS-K12-SYSTEM-REVIEW.md` section 9 and `04-compliance-distribution.md` section 10 both state, as a "back-of-envelope heuristic," that a three-arm between-subjects design targeting a medium effect (Cohen's d roughly 0.4 to 0.5) at standard power (0.80) and alpha (0.05) needs on the order of 60 to 70 students per arm, and that a smaller expected effect (d roughly 0.3) roughly doubles that; both sources explicitly ask for a commissioned formal power analysis once effect size and clustering are set, rather than treating this heuristic as final. Bastani and colleagues (2025)'s guardrailed-versus-unrestricted contrast (a 127 percent practice-performance gain with no significant exam-performance drop, against a 48 percent practice gain paired with a 17 percent exam drop for the unrestricted condition) is directional support that a scoped-tool effect on unassisted post-test performance could exceed a medium effect size, but the paper reports percentage changes on a different task, population, and country than this pilot, with no standard deviation reported in the intake card this draft can convert into a comparable Cohen's d; it is cited here as reason to treat d = 0.4 as a conservative assumption rather than an inflated one; it stands in for direction, never for a formal power analysis.

**Original naive n-per-arm table, replaced** (same d values and n values; the "Source of the assumption" column moves from an unsourced heuristic label to the three named meta-analytic anchors):

> | Assumed d | Source of the assumption | n per arm, naive (no clustering) |
> |---|---|---|
> | 0.5 | Upper end of the system-review and compliance-report heuristic | 76 |
> | 0.4 | Lower end of the same heuristic; this draft's main assumption | 119 |
> | 0.3 | The same sources' own "smaller effect" sensitivity case | 211 |

**Original diversity-outcome Judge-and-scoring cell, replaced** (the open "method to be fixed" question now names a concrete candidate method):

> Automated text-similarity scoring, method to be fixed before Phase 1 data collection, following Doshi and Hauser (2024)'s own similarity measure as the closest precedent

**Original Exploratory analyses sentence, replaced** (the calibration outcome, the provenance-flags-rate outcome, and the required-participation sensitivity check are spliced into the existing list; every original item is preserved):

> Named explicitly here so they are not later reported as if pre-specified: the class-level production-diversity secondary outcome under H1; the Production-tier scientific-understanding probing pass named for overlap-map question 12 in the Study Information section above; the prior-Academy-proficiency covariate; the per-protocol sensitivity analysis under Data exclusion; and any subgroup analysis by grade band, gifted-versus-Title I channel, or route condition not already named as a primary contrast.

## 2026-09-10, `learning/research-os/study/INSTRUMENTS.md`, revision 1: guidance level and production provenance flags added

**Reason.** Same revision 1 pass as the `PREREGISTRATION-DRAFT.md` entry above. `INSTRUMENTS.md` gained two new sections (4, guidance level; 5, production provenance flags) and a new per-class field (6, `productionRequired`), each reading against a design doc that did not exist when the file's own header and closing section were last written.

**Original header status line, replaced:**

> **Status:** draft, bead `ros-08`; section 2's metacognitive confidence item shipped as real code this pass · **Date:** 2026-09-10 · Reads against `src/lib/research-os/probe.ts`, `src/lib/research-os/stages.ts`, `src/lib/research-os/grounding.ts`, `src/lib/research-os/forcing.ts`, `src/lib/research-os/calibration.ts`, `src/lib/research-os/EVIDENCE-SCHEMA.md`, `learning/research-os/PLAN-REVISION-2.md` section 2a, `learning/research-os/LEARNER-STATE-MODEL.md` section 4, `_intake/research-os-k12/04-compliance-distribution.md` section 11 (teacher adoption playbook), `_intake/research-os-k12-literature/hci-human-ai-collaboration/bucinca-malaya-gajos-2021-cognitive-forcing-functions.md`, `_intake/research-os-k12-literature/hci-human-ai-collaboration/bansal-et-al-2021-ai-explanations-complementary-team-performance.md`, `_intake/research-os-k12-literature/hci-human-ai-collaboration/vaccaro-almaatouq-malone-2024-combinations-humans-ai-useful.md`, `_intake/research-os-k12-literature/hci-human-ai-collaboration/lee-et-al-2025-generative-ai-critical-thinking-confidence.md`, `_intake/research-os-k12-literature/hci-human-ai-collaboration/fisher-goddu-keil-2015-searching-for-explanations.md`.

**Original intro paragraph, replaced** (item count moved from three to five; the metacognitive confidence item's own "shipped this pass" phrasing, now stale, was corrected to "shipped"):

> Three instruments the three-arm pilot (`PREREGISTRATION-DRAFT.md`) needs beyond the transfer items themselves (`TRANSFER-TASK-BANK.md`): a retention probe schedule, a metacognitive confidence item, and a teacher time-on-review log. The retention probe schedule and the teacher time-on-review log stay unbuilt; each section below states what exists to build on and what schema addition it needs, following the same gap-naming discipline `src/lib/research-os/EVIDENCE-SCHEMA.md` already uses. The metacognitive confidence item shipped this pass as part of cognitive forcing on Check (`learning/research-os/PLAN-REVISION-2.md` section 2a, `src/lib/research-os/forcing.ts`): section 2 below describes the item as built, moved from a question fired after the verdict to a commit collected before it.

**Original closing section, replaced** (the section's own count and its stale "none of the three instruments is implemented" claim, already false against section 2's own "Status: shipped" line above it, are corrected):

> ## What these three instruments share
>
> Every field named above as a schema gap is additive and optional, following the same discipline `EVIDENCE-SCHEMA.md`'s own contract states directly: a writer omits a field it has nothing for, and no existing transition function, review route, or evidence-event reader needs to change to tolerate the addition. None of the three instruments is implemented; this file specifies what `ros-04` and `ros-06` build against, the same relationship `EVIDENCE-SCHEMA.md` holds to `LEARNER-STATE-MODEL.md` section 4.

## 2026-09-14, `src/app/research-os/page.tsx`, hero-mounted interactive globe removed

**Reason.** Founder spec for the site-local homepage/research-os pass: the interactive `CanonGlobeMount` search tool comes out of the `/research-os` hero, replaced by a fixed, decorative, non-interactive globe rendered once at the page level (`FixedCanonGlobeBackground`, position fixed, anchored bottom right, behind all content, blurred, `pointer-events: none`). The interactive search tool stays live on `/canon`, `/canon/search`, and the new homepage `CanonSearchPanel`; `/research-os` no longer needs its own copy.

**Original JSX, removed verbatim** (sat directly below the hero's CTA row in `ResearchOsPage`, importing `CanonGlobeMount` from `@/app/canon/CanonGlobeMount` and `ScrollReveal` from `@/components/ScrollReveal`, both imports also removed since this was their only use on this page):

```tsx
      {/* Hero visual: the real canon search globe, the same live component,
          real branch data, and real search (against /api/canon/search)
          /canon and /canon/search mount. Its own error boundary degrades
          to the static SVG globe when WebGL is unavailable, the same
          fallback /canon uses. */}
      <ScrollReveal className="relative z-10">
        <div className="w-full px-2 sm:px-4 md:px-6">
          <div className="text-center small-caps text-[11px] tracking-[0.14em] text-[color:var(--aegean-deep)] mb-3">
            § find sources, over the same canon this tool searches
          </div>
          <div id="globe-capture" className="max-w-[1800px] mx-auto">
            <CanonGlobeMount
              branches={globeBranches}
              containerClassName="relative w-full mx-0 md:h-[88vh] md:max-h-[1000px] md:pr-[440px] md:overflow-hidden md:flex md:flex-col rounded-lg border border-[color:var(--hairline)] bg-[color:var(--bone)]/70 backdrop-blur-[1px] shadow-[0_2px_24px_-6px_rgba(31,28,22,0.12)]"
            />
          </div>
        </div>
      </ScrollReveal>
```

Also removed from the same component: the `getBranches()`/`globeBranches` computation at the top of `ResearchOsPage` (its only consumer was the JSX above) and the `"Read the plan ↗"` external link beside the "Try the prototype →" CTA, trimming the hero to the one CTA the founder spec asked for.

## 2026-09-14: Research OS landing trimmed to hero, fixed globe, Five States

File: `src/app/research-os/page.tsx`. Reason: founder direction 2026-09-14: Research OS landing is hero, fixed globe, Five States only. Six sections removed, the alternating-row "Five States" block stays. The `TOOLS` array, the `Card` helper, and their only call sites went with the sections that used them.

Removed section 1, the numbered-table restatement of the five states (the alternating-row version above it stays):

```tsx
<div className="mt-12 small-caps text-[10px] tracking-[0.22em] text-[color:var(--aegean-deep)]">
  § five states per concept
</div>
<p className="mt-4 text-[15px] leading-[1.75] text-[color:var(--basalt-2)] max-w-2xl">
  Each concept in the graph carries one of five states for each learner.
  The states reuse the Academy&apos;s mastery signals and add a reviewed
  production at the top. The design gives a teacher the ability to see,
  question, and override any state, with the override recorded; no
  teacher view has shipped yet (see status, below).
</p>
<div className="mt-6 grid grid-cols-1 gap-px bg-[color:var(--hairline)] grid-hairlines">
  {STATES.map((s, i) => (
    <div
      key={s.name}
      className="bg-[color:var(--bone)] p-6 md:p-7 grid grid-cols-1 md:grid-cols-[140px_1fr_1fr] gap-3 md:gap-6"
    >
      <div className="font-display uppercase text-[18px] tracking-[0.04em] text-[color:var(--basalt)]">
        <span className="text-[color:var(--gold-deep)] mr-2">{i + 1}</span>
        {s.name}
      </div>
      <p className="text-[14px] leading-[1.7] text-[color:var(--basalt-2)]">{s.meaning}</p>
      <p className="text-[13px] leading-[1.7] text-[color:var(--basalt-3)]">{s.signal}</p>
    </div>
  ))}
</div>
```

Removed section 2, "your tools, no pen" (find, quote, check, organize), plus the `TOOLS` array that fed it:

```tsx
const TOOLS: { name: string; body: string }[] = [
  {
    name: "find",
    body: "Retrieval over the canon, mirrored OpenAlex and Crossref metadata, and open-licensed public sources. Every hit carries a license.",
  },
  {
    name: "quote",
    body: "Exact spans with source id, canonical URL, license, and locator. The tool refuses to paraphrase.",
  },
  {
    name: "check",
    body: "Does a quoted span support, contradict, or fail to settle the learner's claim. The tool abstains when retrieval is weak.",
  },
  {
    name: "organize",
    body: "Claim, evidence, and warrant scaffolds; outlines; citation formatting. Labels only, no generated prose.",
  },
];
```

```tsx
<div className="mt-12 small-caps text-[10px] tracking-[0.22em] text-[color:var(--aegean-deep)]">
  § four tools, no pen
</div>
<div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-px bg-[color:var(--hairline)] grid-hairlines">
  {TOOLS.map((t) => (
    <div key={t.name} className="bg-[color:var(--bone)] p-7 md:p-8 flex flex-col gap-3">
      <div className="font-display uppercase text-[20px] tracking-[0.04em] text-[color:var(--basalt)]">
        {t.name}
      </div>
      <div className="w-8 h-0.5 bg-[color:var(--gold)]" />
      <p className="text-[14px] leading-[1.7] text-[color:var(--basalt-2)]">{t.body}</p>
    </div>
  ))}
</div>
```

Removed section 3, "frontier first, then backward":

```tsx
<div className="mt-12 small-caps text-[10px] tracking-[0.22em] text-[color:var(--aegean-deep)]">
  § frontier first, then backward
</div>
<p className="mt-4 text-[15px] leading-[1.75] text-[color:var(--basalt-2)] max-w-2xl">
  A learner or a teacher picks a frontier: a concept at the edge of a
  branch, or a live hypothesis from Bucket&apos;s hypothesis engine. The
  router walks the prerequisite graph backward to what the learner
  already understands, then forward again to the target. Supports fade
  as the learner&apos;s state rises.
</p>
```

Removed section 4, "productions that enter the graph":

```tsx
<div className="mt-12 small-caps text-[10px] tracking-[0.22em] text-[color:var(--aegean-deep)]">
  § productions that enter the graph
</div>
<p className="mt-4 text-[15px] leading-[1.75] text-[color:var(--basalt-2)] max-w-2xl">
  A production is a claim, the quoted evidence behind it, the checks it
  passed, and its citations. When a teacher and a Bucket reviewer accept
  it, the production becomes a node with a citable id, registered on the
  same rail as every paper on this site, and the hypothesis engine can
  read it as evidence. Citation fees for a contributor under eighteen go
  to a guardian or a custodial account, never to the minor directly, and
  recognition ships before any payout does.
</p>
```

Removed section 5, "where it sits" (Academy, Ladder, Research cards), plus the `Card` helper that rendered each tile:

```tsx
<div className="mt-12 small-caps text-[10px] tracking-[0.22em] text-[color:var(--aegean-deep)]">
  § where it sits
</div>
<div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-px bg-[color:var(--hairline)] grid-hairlines">
  <Card href="/academy" title="Academy" body="The consume side: spaced-repetition mastery over the foundations of each branch. Research OS reads the same states." />
  <Card href="/ladder" title="Ladder" body="The L0 to L5 climb from literacy to producing knowledge. Research OS is the production path for the K-12 rung." />
  <Card href="/research" title="Research" body="The tools, datasets, atlas, and papers. Accepted student productions land here as citable nodes." />
</div>
```

```tsx
function Card({ href, title, body }: { href: string; title: string; body: string }) {
  return (
    <Link href={href} className="block h-full">
      <div className="bg-[color:var(--bone)] p-7 md:p-8 flex flex-col gap-3 min-h-[150px] h-full shadow-[inset_0_1px_0_rgba(239,232,212,0.6),inset_0_-1px_0_rgba(31,28,22,0.18)]">
        <div className="font-display uppercase text-[20px] tracking-[0.04em] text-[color:var(--basalt)]">
          {title}
        </div>
        <div className="w-8 h-0.5 bg-[color:var(--gold)]" />
        <p className="text-[14px] leading-[1.7] text-[color:var(--basalt-2)]">{body}</p>
        <div className="mt-auto pt-3 text-[11px] small-caps tracking-[0.14em]">
          <span className="text-[color:var(--aegean-deep)] underline decoration-[color:var(--gold)] underline-offset-4">
            open {title.toLowerCase()} →
          </span>
        </div>
      </div>
    </Link>
  );
}
```

Removed section 6, "status":

```tsx
<div className="mt-12 small-caps text-[10px] tracking-[0.22em] text-[color:var(--aegean-deep)]">
  § status
</div>
<p className="mt-4 text-[15px] leading-[1.75] text-[color:var(--basalt-2)] max-w-2xl">
  Design, iteration 2, September 2026. On main today: frontier-backward
  routing with confidence flags on a weak edge, a diagnostic probe for
  a cold-start learner, the four-tool workspace (find, quote, check,
  organize) with every contract enforced in code, a teacher review
  queue and class view with an accept path, an engine bridge covered
  by tests, self-service export and delete of a learner&apos;s own
  data, and a consent gate in front of every learner-authored write.
</p>
<p className="mt-4 text-[15px] leading-[1.75] text-[color:var(--basalt-2)] max-w-2xl">
  Not yet on main: applying an accepted production to the live
  database, roster sync from a school system, verified parental
  consent, a payment to a minor contributor, and canon write-back
  without a human sign-off.
</p>
<p className="mt-4 text-[15px] leading-[1.75] text-[color:var(--basalt-2)] max-w-2xl">
  Grades 3 to 5 (why the sky is blue) and the history of quantum
  physics for grades 9 to 12 remain the two candidate subjects for the
  next demonstration; which one leads is still an open choice
  (<code className="text-[13px]">_intake/research-os-k12/RESEARCH-OS-K12-SYSTEM-REVIEW.md</code>{" "}
  section 11). The plan, the learner-state model, the production
  schema, the vendor and data-source map, and the funding and people
  map are public in the repository under{" "}
  <code className="text-[13px]">learning/research-os/</code> and{" "}
  <code className="text-[13px]">_intake/research-os-k12/</code>.
  Pilot classrooms, a pre-registered study of the four-tool constraint,
  and a state-validation paper come before any wider release.
</p>
```

The wrapping `<div className="max-w-[1100px] mx-auto px-4 md:px-6 py-14 md:py-32">` and its leading `carved-rule` divider were removed along with the six sections, since nothing remained under them.

## 2026-09-14: Home page logo mark removed above the headline

File: `src/components/Presentation.tsx`. Reason: founder direction 2026-09-14, the square stone glyph sat above the headline and read as noise ahead of the panel-peek fix; the `Image` import went with its only call site.

```tsx
<div className="carve-in-1 flex justify-center mb-8">
  <Image
    src="/brand/omega-stonepunk.png"
    alt="The bucket.foundation mark, a carved inverse omega"
    width={72}
    height={72}
    priority
    className="rounded-sm border-2 border-[color:var(--basalt)] shadow-[0_20px_30px_-18px_rgba(13,13,13,0.45)]"
  />
</div>
```

## 2026-09-14: Canvas-readback landmask loader replaced with a precomputed asset

File: `src/components/canon-globe/landmaskFromImage.ts`. Reason: the founder's Brave browser (fingerprint protection) refuses the 2D canvas context or the `getImageData` readback, the old `loadLandmask` threw, and the globe rendered with no land dots. The land/ocean decision is now baked offline by `scripts/globe/build-landmask.mjs` into `public/textures/earth/landmask-2k.bin` (1-bit packed grid) plus `landmask-2k.json` (header); the client fetches and unpacks bytes instead of drawing the daymap into a canvas. See `CHANGELOG.md` in this directory and `learning/research-os/CHANGE-LEDGER.md` for the full account.

The `loadLandmask` function body below (the whole file, unchanged since first written) is preserved verbatim:

```ts
// Landmask sampler. Loads a daymap image into an offscreen canvas and exposes
// `isLand(lat, lng)` based on a luminance threshold. Ocean pixels on the NASA
// blue-marble daymap read dark blue (low R, modest G, high B); land reads as
// warm browns + greens with much higher luminance. A simple Y > threshold cut
// is enough to separate them at 2k resolution.

export type Landmask = {
  width: number;
  height: number;
  isLand: (lat: number, lng: number) => boolean;
  sample: (lat: number, lng: number) => { r: number; g: number; b: number; y: number };
};

export async function loadLandmask(
  url: string,
  threshold = 90
): Promise<Landmask> {
  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const el = new Image();
    el.crossOrigin = "anonymous";
    el.onload = () => resolve(el);
    el.onerror = reject;
    el.src = url;
  });

  const canvas = document.createElement("canvas");
  canvas.width = img.naturalWidth;
  canvas.height = img.naturalHeight;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) throw new Error("landmask: 2d context unavailable");
  ctx.drawImage(img, 0, 0);
  const { data, width, height } = ctx.getImageData(0, 0, canvas.width, canvas.height);

  const sample = (lat: number, lng: number) => {
    // equirectangular: lng in [-180,180] → x in [0,w); lat in [90,-90] → y in [0,h)
    const u = ((lng + 180) % 360) / 360;
    const v = (90 - lat) / 180;
    const x = Math.min(width - 1, Math.max(0, Math.floor(u * width)));
    const y = Math.min(height - 1, Math.max(0, Math.floor(v * height)));
    const i = (y * width + x) * 4;
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    // Rec. 601 luma
    const yLum = 0.299 * r + 0.587 * g + 0.114 * b;
    return { r, g, b, y: yLum };
  };

  const isLand = (lat: number, lng: number) => {
    const { r, g, b, y } = sample(lat, lng);
    // Ocean is dominated by blue channel; land tends to have R or G >= B.
    if (b > r + 25 && b > g + 10) return false;
    return y > threshold;
  };

  return { width, height, isLand, sample };
}
```
## 2026-09-11, `src/app/research-os/page.tsx`, status band refresh to current main

**Reason.** Bead-equivalent task: refresh the status band so it states truthfully what is on main today, verified against `gh pr list --state merged --limit 60` and the docs under `learning/research-os/` (`ROUTING.md`, `WORKSPACE.md`, `GUIDANCE.md`, `LATERAL-READING.md`, `PRODUCTION-GUARD.md`, `TEACHER-LAYER.md`, `ROSTER.md`, `ENGINE-BRIDGE.md`, `compliance/`, `study/`, `tools/canon-pipeline/SIGNOFF.md`). The paragraph below named only the `ros-07`-era shipped set (routing, probe, workspace, teacher layer, engine bridge, export/delete, consent gate); it named none of cognitive forcing, faded guidance, lateral reading, the production provenance guard, or the OneRoster CSV importer, all merged to `main` since. Replaced with two paragraphs that name every shipped item this pass confirmed against a merged PR, keeping the same heading and the same lead sentence shape. The "not yet on main" paragraph below it also understated the gap: it named "roster sync from a school system" where a OneRoster CSV importer has since shipped (Clever and ClassLink stay stubs), and it named "canon write-back without a human sign-off" where the sign-off tool has since shipped, but it omitted the LLM-assisted edge-inference proposal path and the absence of a partner school. Replaced with the accurate list. The third paragraph (candidate subjects, repository pointers, pilot/study framing) is unchanged in substance, gaining only a closing sentence and a link to `PLAN-REVISION-3.md`.

**Original text, replaced in the "§ status" paragraph** (the first paragraph, "Design, iteration 2..."):

> Design, iteration 2, September 2026. On main today: frontier-backward
> routing with confidence flags on a weak edge, a diagnostic probe for
> a cold-start learner, the four-tool workspace (find, quote, check,
> organize) with every contract enforced in code, a teacher review
> queue and class view with an accept path, an engine bridge covered
> by tests, self-service export and delete of a learner&apos;s own
> data, and a consent gate in front of every learner-authored write.

**Original text, replaced in the "§ status" paragraph** (the second paragraph, "Not yet on main..."):

> Not yet on main: applying an accepted production to the live
> database, roster sync from a school system, verified parental
> consent, a payment to a minor contributor, and canon write-back
> without a human sign-off.

## 2026-09-14 merge of dev into site-local-2026-09-14

dev commit 65dbde7d0 (#117, "Research OS status band refresh to current main") re-added the status band, five-state table, four tools, frontier, productions, and where-it-sits sections to `src/app/research-os/page.tsx`. The founder removed those sections from this page on 2026-09-14 (entry above), so the merge keeps the landing version. The #117 text is unchanged on `origin/dev` at `git show 65dbde7d0:src/app/research-os/page.tsx`.

## 2026-09-15 decorative globe driver

`AutoRotateDriver` and its three constants, and the `scrollSpeedRef` prop, left `CanonGlobe.tsx` and `CanonGlobeMount.tsx` with the scroll-only spin. Full prior source: `git show 4f95f109b:src/components/canon-globe/CanonGlobe.tsx`.

## 2026-09-15 Research OS page copy

The eyebrow "§ Research OS · K-12", the "Try the prototype" hero CTA, the "§ five states" eyebrow, and the per-state meaning and signal sentences left `src/app/research-os/page.tsx` for the artifact layout. Prior file: `git show 19a7bc1c6:src/app/research-os/page.tsx`.

## 2026-09-15 painted edge overlay

The bone radial-gradient overlay div inside `FixedCanonGlobeBackground.tsx` and its `nofade` query switch are gone; the Halo and shell fade in their shaders instead. Prior file: `git show 191e0ec90:src/components/FixedCanonGlobeBackground.tsx`.
