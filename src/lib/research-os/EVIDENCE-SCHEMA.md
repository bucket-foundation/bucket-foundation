# Research OS Evidence Schema

**Status:** contract, docs only, no code, bead `ros-02` · **Date:** 2026-09-10 · Reads against `learning/research-os/LEARNER-STATE-MODEL.md` section 4, `src/lib/research-os/types.ts`, `src/lib/research-os/stages.ts`, `src/lib/research-os/probe.ts`, `src/lib/research-os/grounding.ts`, `src/lib/research-os/db.ts`'s `recordEvidence`, and the `graph.learner_node_state`, `graph.productions`, and `graph.teacher_reviews` tables in `supabase/migrations/20260910000000_research_os_graph.sql` and `supabase/migrations/20260910020000_research_os_teacher_reviews.sql`.

This file states the evidence jsonb contract the learner state model needs, so `ros-04` and `ros-06` can implement it without re-deriving the reasoning from `LEARNER-STATE-MODEL.md` section 4. It changes no code, no type, and no migration; it is the specification those beads implement against.

## What `graph.learner_node_state.evidence` stores today

`EvidenceEvent` (`src/lib/research-os/stages.ts`):

```ts
interface EvidenceEvent {
  at: string;
  kind: "open" | "explanation" | "check" | "transfer_item" | "production_submitted" | "teacher_review";
  result?: "support" | "contradiction" | "unknown";
  confidence?: "high" | "medium" | "low";
  held?: boolean;
  heldReason?: string;
  note?: string;
  reviewerId?: string;
}
```

`recordEvidence` (`src/lib/research-os/db.ts`) appends one such object to the array on every transition and upserts the row's current `stage` alongside it. The array is append-only in practice, no code path removes or edits a prior entry, but nothing in the schema enforces that; it is a convention documented in the migration's column comment, a discipline the application code has to keep rather than a rule the database itself checks.

## The gap

The stored event carries enough to answer "what is this learner's stage now." It lacks the fields to answer "what did the learner write," "what did the model say," "which pooled item was this," "which session was this part of," or "did a second rater agree," all of which `LEARNER-STATE-MODEL.md` section 4's measurement plan needs. The contract below closes each of those, one field at a time, each tagged with the gap it closes.

## The contract

An evidence event under this contract is the existing `EvidenceEvent` shape plus the fields below. Every added field is optional at the type level, since not every `kind` populates every field, matching the existing pattern where `result` and `confidence` are already optional; a writer omits a field it has nothing for rather than writing a placeholder value.

```ts
interface EvidenceEvent {
  // Existing fields, unchanged.
  at: string;
  kind: "open" | "explanation" | "check" | "transfer_item" | "production_submitted" | "teacher_review";
  result?: "support" | "contradiction" | "unknown";
  confidence?: "high" | "medium" | "low";
  held?: boolean;
  heldReason?: string;
  note?: string;
  reviewerId?: string;

  // Closes "no before-and-after stage pair on an event."
  // The row's stage immediately before and after this event, so a reader
  // reconstructs the transition timeline from the log alone, with no
  // re-run of the current stages.ts rule set required.
  fromStage?: Stage;
  toStage?: Stage;

  // Closes "no stored explanation, transfer-item answer, or transfer-item id."
  // The learner-authored text this event judged: an explanation for a
  // "check" event, an answer for a "transfer_item" event.
  learnerText?: string;
  // The stable id of the pooled item a "transfer_item" event answered,
  // for exposure control against the sealed held-out pool.
  itemId?: string;

  // Closes "no stored model verdict beyond result and confidence."
  // Populated on a "check" event from grounding.ts's GradeResult.
  abstained?: boolean;
  modelFeedback?: string;
  citations?: string[];

  // Closes "no session or attempt grouping."
  // Groups every tool call and evidence event from one workspace sitting.
  // Client-generated (same discipline the offline-sync design in
  // RESEARCH-OS-K12-SYSTEM-REVIEW.md section 3 already uses for evidence
  // records queued offline), so a session id is stable across a
  // reconnect.
  sessionId?: string;

  // Closes "no inter-rater fields on a teacher_review event."
  // Set only when this specific decision was sampled for a second,
  // blind rating (LEARNER-STATE-MODEL.md section 4's inter-rater
  // procedure). secondRaterId and secondDecision are populated once the
  // second rating lands; agrees is computed once both decisions exist.
  sampledForSecondRating?: boolean;
  secondRaterId?: string;
  secondDecision?: "approved" | "returned";
  agrees?: boolean;
}
```

## Inter-rater columns on `graph.teacher_reviews`

The contract above adds sampling and second-rating fields to the mirrored evidence event, but `graph.teacher_reviews` is the table the review queue reads and the table any pilot-analysis query joins against, so the same fields belong there as real columns, not only inside a jsonb blob, for the inter-rater kappa computation `LEARNER-STATE-MODEL.md` section 4 specifies to run as a plain SQL aggregate:

```sql
-- Columns this contract adds to graph.teacher_reviews (a future migration,
-- not this file; ros-06's scope).
alter table graph.teacher_reviews add column if not exists sampled_for_second_rating boolean not null default false;
alter table graph.teacher_reviews add column if not exists second_reviewer_id uuid references auth.users (id);
alter table graph.teacher_reviews add column if not exists second_decision text check (second_decision in ('approved','returned'));
alter table graph.teacher_reviews add column if not exists agrees boolean;
```

`sampled_for_second_rating` is set at write time by whatever sampling rule the pilot's protocol names, a fixed fraction of all decisions plus every `returned` decision, per `LEARNER-STATE-MODEL.md` section 4. `second_reviewer_id` and `second_decision` are written once a second reviewer, blind to the first reviewer's `decision` and `reason`, completes their own rating of the same case. `agrees` is a generated or trigger-maintained column, `decision = second_decision`, computed once both exist, never hand-written.

## The corrective event on `graph.productions`

`LEARNER-STATE-MODEL.md` sections 1, 3, and 4 all name the same gap: a returned production leaves `graph.learner_node_state.stage` at `production` with no evidence event recording the correction, because the review route's production branch never calls `recordEvidence`. The contract for closing this is not a new field, it is a new write: the production review handler adds one call to `recordEvidence` on a `"returned"` decision, appending an event of a new `kind`:

```ts
// Add "production_returned" to EvidenceEvent's kind union.
kind: "open" | "explanation" | "check" | "transfer_item" | "production_submitted" | "production_returned" | "teacher_review";
```

with `fromStage: "production"`, `toStage: "production"` (the append documents the correction without violating the high-water-mark rule `stageAtLeast` and every existing transition function already enforce; `stage` does not move backward, the evidence log instead carries the fact that this particular production was rejected, which any outcome query filtering on `graph.productions.status = "accepted"`, per `LEARNER-STATE-MODEL.md` section 1's own instruction, already handles without needing `stage` itself to reflect the rejection).

## The `"quote"` event

Feeds `production-guard.ts`'s source verification. The production guard bead adds a second, standalone new event `kind` (beside `production_returned` above): `"quote"`, written by `stages.ts`'s `onQuoteReturned` whenever the Quote tool (`workspace/route.ts`'s `"quote"` case) returns a real curated passage from `src/lib/research-os/passages.ts`, rather than its own `"summary"` fallback:

```ts
// Add "quote" to EvidenceEvent's kind union.
kind: "open" | "explanation" | "check" | "transfer_item" | "production_submitted" | "production_returned" | "teacher_review" | "quote";
```

with `fromStage`/`toStage` both set to the learner's current stage (Quote never advances a stage, the same "set, equal" pattern the `check` event already uses when grading is not grounded) and a new field, `locator?: string`, the passage's own `QuotePassage.locator`. No other field is populated: a `"quote"` event carries no `result`, `confidence`, or `learnerText`, since there is no verdict or learner-authored text to record, only the fact that this learner pulled this exact passage.

This closes the gap `PRODUCTION-GUARD.md` section 1 names: a Production's cited source is only verifiable against a real Quote call when that call left a record with a `locator` a source line's own text can be checked against. `production-guard.ts`'s `checkSourceProvenance` reads every `"quote"`-kind event across a learner's whole `learner_node_state.evidence`, one node at a time is not enough, a learner quotes several nodes across one Production's own sources.

## What this file does not cover

Retention and proficiency signals reaching a Research OS row from Academy's FSRS and IRT state (`LEARNER-STATE-MODEL.md` section 3's four-step slug-to-atom-id bridge) are out of scope here. Closing that gap needs a read path from `bucket.academy_progress` into a Research OS response, work for a separate bead rather than a change to what `graph.learner_node_state.evidence` itself stores. The `graph.learner_node_state.confidence` column's write path, the visible confidence `PLAN.md` section 2 promises, is also out of scope here: it is a value this evidence log makes computable, derived from the fields this contract adds, and the log itself needs no further field to support it.
