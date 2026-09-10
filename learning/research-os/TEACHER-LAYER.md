# Research OS Teacher Layer

**Status:** shipped, bead `ros-06` · **Date:** 2026-09-10 · Reads against `learning/research-os/PLAN-REVISION-1.md` section 3 item 5, `learning/research-os/ENGINE-BRIDGE.md`, `src/lib/research-os/EVIDENCE-SCHEMA.md` (`docs/ros-02-learner-state-model`), `_intake/research-os-k12/RESEARCH-OS-K12-SYSTEM-REVIEW.md` section 3 (the teacher layer) and `04-compliance-distribution.md` (teacher-in-the-loop as the human-oversight requirement).

This covers the two pieces PLAN-REVISION-1.md's item 5 named as blocking every downstream engine-bridge item: a class view a reviewer can read, and an accept path that moves a Production to `"accepted"`.

## Data model

`supabase/migrations/20260910030000_research_os_classes.sql` adds two tables to the private `graph` schema, alongside the migration for the same accept path's `notes` column:

| Table | Columns | Purpose |
|---|---|---|
| `graph.classes` | `id`, `name`, `reviewer_email`, `created_at` | A named group of learners, owned by one reviewer email. |
| `graph.class_members` | `class_id`, `learner_id` | Who is in a class. |
| `graph.productions.notes` (new column) | `jsonb`, append-only, default `[]` | A teacher's note on a decision, `{at, reviewerId, decision, reason}`, written on both approve and return. |

`reviewer_email` is text rather than a foreign key into a role table: `src/lib/research-os/reviewer.ts`'s `RESEARCH_OS_REVIEWER_EMAILS` env-var allowlist stays the auth gate, matching the `teacher_reviews` migration's own precedent (Phase 0/1 has no `role` column anywhere).

**TODO(Phase 1, roster sync).** `_intake/research-os-k12/RESEARCH-OS-K12-SYSTEM-REVIEW.md` section 3's integrations list names the real target: OneRoster 1.2 via Clever/ClassLink, plus Google Classroom import. `graph.class_members` rows are entered by hand today; a sync job keyed the same way (`class_id`, `learner_id`) replaces the manual step without changing any downstream reader (`src/lib/research-os/class-view.ts`, `src/app/api/research-os/class/route.ts`). No code in this bead assumes rows arrive by hand; only the current absence of a sync job does.

## Gates

Two layers, matching every other `graph.*` table in this repo:

1. **RLS**, defense in depth. `graph.classes.reviewer_select` matches `lower(auth.jwt() ->> 'email')` against `lower(reviewer_email)`; `graph.class_members.own_select` lets a learner read their own membership; `graph.class_members.reviewer_select` lets a reviewer read membership rows for a class their own email owns, via an `exists` join back to `graph.classes`. None of this runs today: every read goes through the service-role client, which bypasses RLS.
2. **Server check**, the real gate today. `src/lib/research-os/db.ts`'s `loadClassesForReviewer` filters on the caller's verified email (`src/lib/research-os/reviewer.ts`'s `verifyReviewer`, never a client-supplied value) before any class or learner id crosses into a response. `GET /api/research-os/class` computes the grid, the blocked list, the ready list, and the queue entirely server-side; the client page (`src/app/research-os/class/page.tsx`) renders JSON, it never queries `graph.*` on its own.

A signed-in learner who is not on the allowlist gets a 403 from the class route the same way they already do from the review route.

## The class view

`GET /api/research-os/class` (`branch`, `target`, `staleDays` query params, defaulting to `02-physics`, `why-the-sky-is-blue`, `3`) returns, per class:

- **`grid`**: state per `(learner, node)` over the seed path, in `src/lib/research-os/class-view.ts`'s `seedPathOrder` (the same `computeFrontier` backward walk `frontier.ts` already runs, called with an empty state list so the walk reaches every root, giving a learner-independent column order). A learner with no record on a node reads as `access`, no timestamp.
- **`blocked`**: a learner whose own frontier-backward route's next unmastered node (`findBlockedLearners`, the first entry of `computeFrontier`'s own `gap`) has a state record below Understanding whose `updatedAt` is older than `staleDays`. A node with no record at all is "not started," not blocked; there is no timestamp to measure staleness against.
- **`readyForHarderTarget`**: a learner who has not started some node in the branch, where that node has at least one direct `prerequisite` edge and every one of those prerequisites reads at Internalization or above for that learner (`findReadyForHarderTarget`). A root node (no prerequisites) never qualifies.
- **`queue`** (shared across a reviewer's own classes, since `graph.teacher_reviews` carries no `class_id` to split it by): the same two "pending" reads `GET /api/research-os/review` performs, filtered to the union of every learner across the reviewer's own classes.

Every computation above is a pure function over plain `GraphNode`/`GraphEdge`/`LearnerNodeState` arrays, unit-tested in `scripts/test-research-os-teacher-class.ts` with no database, matching `frontier.ts` and `closure.ts`'s own convention.

The grid table can run wider than a phone screen (one column per seed-path node); it scrolls inside its own `overflow-x-auto` container rather than pushing the page wide, the same exception `src/app/globals.css` already carves out for `CodeBlock`'s `<pre overflow-x-auto>` beside the page-wide `overflow-x: hidden` rule.

## The accept path

`POST /api/research-os/review` with `{kind: "production", productionId, decision, reason?}`:

| Decision | `graph.productions.status` | `graph.productions.notes` | `graph.learner_node_state` | Outbox |
|---|---|---|---|---|
| `approved` | `accepted` | appended | `stage` re-affirmed at `production` (already there since submission); a `teacher_review` evidence event logged, `fromStage`/`toStage` both `production`, `reviewId` set | `db.ts`'s `emitProductionOutboxIfAccepted` runs, the same function `POST /api/research-os/production` already used for this, shared rather than duplicated |
| `returned` | `draft` (not `"returned"`, so the learner can revise and resubmit through the same submit path) | appended | `stage` **stays** at `production`; a `production_returned` evidence event logged, `fromStage`/`toStage` both `production`, `reviewId` set | not emitted (`buildProductionOutboxRow` throws on a non-`"accepted"` row, unreached here) |

Both `approved` and `returned` call `recordEvidence` now. Earlier in this bead's own work, only `approved` did, which left a returned production's `stage` sitting at `production` with no evidence event recording the correction (found in review during `ros-02`'s evidence-schema pass, `docs/ros-02-learner-state-model`). `stage` never moves backward on either decision: every transition in `src/lib/research-os/stages.ts` enforces the high-water-mark rule (`stageAtLeast`), and `onProductionReturned` (the new function this fix adds) follows it, per `src/lib/research-os/EVIDENCE-SCHEMA.md`'s own "corrective event" section: the correction lives in the evidence event itself and in `graph.productions.status` going back to `draft`, with `stage` left where it stood. Any query answering "was this production accepted" already filters on `graph.productions.status = "accepted"`, never on `learner_node_state.stage` alone.

`onProductionReview`/`onProductionReturned` (`stages.ts`) both accept an optional `reviewId`, the `graph.teacher_reviews` row id the decision just inserted, carried onto the evidence event for a join between the audit table and the learner's own evidence log with no timestamp matching. This field sits beside `EVIDENCE-SCHEMA.md`'s documented contract as this bead's own addition, cheap and additive to the same event the contract's `fromStage`/`toStage` fields already ride on.

`/api/research-os/production`'s own POST route now calls the same `emitProductionOutboxIfAccepted` (extracted from its prior inline block, unchanged behavior) rather than a second copy of the outbox-emission logic, so both entry points that can ever reach `status: "accepted"` go through one function.

## Tests

`scripts/test-research-os-teacher-class.ts`, wired into `npm run test:research-os`:

- A fixture class of three learners over the real seed path (`supabase/seed/research-os-sky-blue.json`): grid shape, a mid-path learner's cell values, a near-done learner's target cell staying `access`.
- `findBlockedLearners` / `findReadyForHarderTarget` against a small synthetic graph (`A -> B -> C`, `X,Y -> Z -> W`): stale-past-threshold, not-yet-stale, never-opened, already-mastered, all-prerequisites-met, one-prerequisite-short, already-started, root-never-qualifies.
- `isReviewerEmail`: allows an allowlisted address (case- and whitespace-insensitive), rejects a non-reviewer, fails closed on an unset or empty allowlist.
- `onProductionReview` / `onProductionReturned`: the evidence event shape each produces, including `fromStage`/`toStage`/`reviewId`, and that a return never lowers `nextStage`.
- The real, unmodified `buildProductionOutboxRow` accepts a production shaped exactly like what the accept path produces, and throws on a `"draft"` (returned) row, proving the accept-path-to-outbox wiring at the data-shape level.
- A static read of `20260910030000_research_os_classes.sql` asserting RLS is enabled and the reviewer/learner-scoped policies are present.

**What this suite does not cover.** No test in this repo's `npm run test:research-os` chain touches a live Postgres; every one runs against plain fixture arrays or, for the migration check above, the migration file's own text. `writeProductionOutbox` (the live Supabase upsert), the RLS policies' behavior under a real Postgres role, and `verifyReviewer`'s token-verification network call are each exercised only through the pure logic they compose. This matches every other `scripts/test-research-os-*.ts` file already in this repo; standing up a live-DB test setup is out of this bead's scope.
