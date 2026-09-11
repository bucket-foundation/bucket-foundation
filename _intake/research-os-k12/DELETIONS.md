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
