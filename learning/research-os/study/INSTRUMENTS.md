# Research OS for K-12: Pilot Instruments

**Status:** draft, bead `ros-08` · **Date:** 2026-09-10 · Reads against `src/lib/research-os/probe.ts`, `src/lib/research-os/stages.ts`, `src/lib/research-os/grounding.ts`, `src/lib/research-os/EVIDENCE-SCHEMA.md`, `learning/research-os/LEARNER-STATE-MODEL.md` section 4, `_intake/research-os-k12/04-compliance-distribution.md` section 11 (teacher adoption playbook), `_intake/research-os-k12-literature/hci-human-ai-collaboration/lee-et-al-2025-generative-ai-critical-thinking-confidence.md`, `_intake/research-os-k12-literature/hci-human-ai-collaboration/fisher-goddu-keil-2015-searching-for-explanations.md`.

Three instruments the three-arm pilot (`PREREGISTRATION-DRAFT.md`) needs beyond the transfer items themselves (`TRANSFER-TASK-BANK.md`): a retention probe schedule, a metacognitive confidence item fired after every Check-tool result, and a teacher time-on-review log. None of the three is built in the shipped codebase today; each section below states what exists to build on and what schema addition it needs, following the same gap-naming discipline `src/lib/research-os/EVIDENCE-SCHEMA.md` already uses.

## 1. Retention probe schedule

### What this instrument builds on

`src/lib/research-os/probe.ts` ships one probe mechanism today, reserved for a cold-start diagnostic and left untouched by this section. Its own docstring names its scope directly: it fires only for a learner with no state record on any ancestor of a routing target, "the common cold-start shape," graded through the same `gradeExplanation` call Check uses, with `onProbeCheckResult` scoring the result differently from an in-path Check because a cold-start answer means something different from an answer given after opening the node. What this section reuses is its *pattern*: a pure, dependency-free due-ness function, a tier-spread node-selection function, and the same `gradeExplanation` grading path `onProbeCheckResult` already calls, applied to a different trigger and a different question source.

### Due-ness

A retention probe is due for a learner on a node once that node has granted Understanding (a `check` evidence event with `result: "support"`, confidence above `"low"`, `abstained: false`, per `LEARNER-STATE-MODEL.md` section 1), at three fixed offsets from that event's own `at` timestamp:

| Interval | Offset from the Understanding-granting event | What it measures |
|---|---|---|
| Immediate | Same session, or within 24 hours if the Internalization transfer item is answered in a later sitting | The near-transfer post-test itself, `PREREGISTRATION-DRAFT.md` H1's primary outcome |
| 1 week | 7 days, plus or minus 1 day scheduling tolerance | An early retention checkpoint, positioned between the immediate test and the 8-week interval so attrition and a possible early decay curve are visible before the study's own primary retention window closes |
| 8 weeks | 56 days, plus or minus 3 days scheduling tolerance | The primary retention outcome named in `RESEARCH-OS-K12-SYSTEM-REVIEW.md` section 9 and `PREREGISTRATION-DRAFT.md` H1 and H6 |

A proposed sibling function, `retentionProbeDue(nodeId, understandingGrantedAt, states)`, mirrors `probe.ts`'s own `probeDue` signature and purity discipline (no I/O, unit-testable with no database), returning which of the three intervals, if any, is currently open for a given learner and node given the current date and the learner's own evidence log. This is a new function to build under `ros-04`, alongside the existing `probeDue`, which stays reserved for the cold-start case its own docstring names.

### Question source

The cold-start probe's own `selectProbeNodes` builds a question from a plain node-title template with no held-out pool, fitting a probe whose only job is coarse placement. A retention probe instead scores a study outcome directly, so it draws its question from `TRANSFER-TASK-BANK.md`'s sealed pool for the target node, using the bank's own exposure-control rule: an item id, once served to a learner at one interval, is marked consumed and never re-served to that same learner at a later interval, so the 1-week and 8-week probes on the same node use the bank's two different items (`-a` and `-b`) rather than repeating the immediate test's own item, matching `LEARNER-STATE-MODEL.md` section 4's exposure-control requirement directly. A node's two-item bank is exhausted after the immediate and one delayed probe; the study's own design accepts this limit rather than serving a repeat, since a repeated item would test memory of the item itself rather than of the underlying concept.

### Grading and the FSRS-versus-fixed comparison

Each retention-probe attempt is graded through the same `gradeExplanation` call `onProbeCheckResult` already uses, scored pass or fail per `TRANSFER-TASK-BANK.md`'s own rubric. For `PREREGISTRATION-DRAFT.md` H6, a node's review-interval condition (FSRS-scheduled versus fixed-interval control) is assigned once, at the node's own Understanding-granting event, and determines which of the three offsets above triggers a served item for that node and learner: the fixed-interval control condition serves probes at the same three calendar offsets stated above regardless of any FSRS-computed retrievability estimate, while the FSRS-scheduled condition, once `LEARNER-STATE-MODEL.md` section 3's own four-step Academy-bridge join is built, would instead serve a probe when FSRS's own computed retrievability crosses a set threshold. That bridge is confirmed unbuilt (`LEARNER-STATE-MODEL.md` section 3, a full-codebase search finding zero references to `retrievability`, `stability`, or `fsrs` under `src/lib/research-os/`); until it exists, the FSRS-scheduled condition in this pilot is simulated with a fixed schedule computed offline from a default FSRS parameter set applied to the node's own difficulty rating. This limitation is stated here directly, so it is checked against real per-learner FSRS estimates once the bridge lands, instead of going unnoticed.

### Schema gap

Neither `EvidenceEvent`'s existing fields nor `src/lib/research-os/EVIDENCE-SCHEMA.md`'s proposed contract carries a field distinguishing which retention interval a given `transfer_item` event belongs to, or which scheduling condition (FSRS or fixed) the node was assigned. `PREREGISTRATION-DRAFT.md`'s own Variables section already names the two fields this gap needs, `retentionInterval` ("immediate" | "1wk" | "8wk") and `schedulingCondition` ("fsrs" | "fixed"), proposed as optional additions to `EvidenceEvent` for `ros-04`/`ros-06` to add; this section is where that proposal's underlying instrument design lives.

## 2. Metacognitive confidence item

### Design

Immediately after the Check tool returns a verdict (support, contradiction, or unknown, with or without abstaining), the workspace asks the learner one additional question before advancing: "How sure are you that this explanation is correct, now that you have seen the check?" on a four-point scale (not sure at all, a little sure, fairly sure, certain), logged as part of the same `check` evidence event rather than as a separate event, since it is a property of that specific check attempt. This is the calibration outcome Lee and colleagues (2025) name directly: across 936 real generative-AI use examples, higher self-reported confidence in the AI's own output was associated with less critical thinking during the task, while higher self-confidence in one's own unassisted ability was associated with more, the opposite direction. The item above asks for the first of those two confidences (confidence in the tool's verdict, given the tool's own verdict just returned), against which this study computes a calibration score: the gap between the learner's stated confidence and the tool's own verdict correctness on a later-audited subset (the same human cross-scoring sample the Understanding-scoring rubric already draws, per `PREREGISTRATION-DRAFT.md`'s Variables section), following Lee and colleagues' own framing that a well-calibrated learner's stated confidence should track the tool's actual reliability rather than the tool's own confidence label alone.

### The Fisher-and-colleagues unrelated-topic check

Fisher, Goddu, and Keil (2015) found that searching the internet for an explanation in one domain inflated a person's self-rated understanding of *unrelated* topics never searched, with no matching gain in tested performance on those unrelated topics, a knowledge-source-confusion effect distinct from ordinary overconfidence on the checked material itself. This pilot adapts that design directly: once per session, after a learner completes a Check on one node, the workspace asks the same four-point confidence question about a second, unrelated node the learner has not opened this session and the Check tool has not touched, phrased identically to the primary item ("How sure are you that you could explain [unrelated node's title] to someone else?"). A rise in this unrelated-node confidence rating, measured against a learner's own baseline rating on the same unrelated node collected before any Check use that session, replicates Fisher and colleagues' own finding if it appears with no matching rise in that unrelated node's own tested Understanding-state pass rate, the exact gap between felt confidence and tested performance `LEARNER-STATE-MODEL.md` section 4's Understanding-scoring rubric is built to keep visible rather than let a fluent Check verdict paper over.

### Schema gap

No evidence-event field today carries a confidence self-report of either kind. This instrument proposes two additional optional `EvidenceEvent` fields for `ros-04`/`ros-06`, parallel in shape to the model's own `confidence` field already in the schema: `learnerConfidence` ("not_sure" | "a_little" | "fairly" | "certain"), recorded on the same `check` event the question follows, and a lightweight sibling event kind, `"unrelated_confidence_probe"`, carrying `learnerConfidence` and the unrelated node's id, since this second item is not itself a check or a transfer attempt and does not belong under either existing `kind` value.

## 3. Teacher time-on-review log

### Design

`04-compliance-distribution.md` section 11 states the adoption bar directly: "the queue where teachers approve student productions... has to net-save time versus a teacher's current grading workflow or it will not survive a semester." This instrument turns that bar into a measured outcome rather than a design aspiration. Every time a teacher opens the review queue, the workspace logs a session start; every individual review decision (approve or return, on either a `transfer_item` review or a `production` review, per `LEARNER-STATE-MODEL.md` section 3's two review kinds sharing `POST /api/research-os/review`) logs the elapsed time between that item first becoming visible to the reviewer and the decision being submitted, the item's own position in the confidence-sorted queue at the time it was opened (`04-compliance-distribution.md` section 11's own "default-sort by confidence, lowest-confidence first" design), and whether the decision was part of a batch-approve action or an individually opened item.

| Field | What it captures | Feeds |
|---|---|---|
| `queueSessionId` | Groups every decision made in one continuous review sitting, the same `sessionId` discipline `EVIDENCE-SCHEMA.md` already specifies for the learner-side workspace | Session-level time-on-review totals |
| `itemShownAt` / `decisionAt` | The elapsed-time-per-decision measure | Per-decision review time, the direct adoption-speed outcome |
| `queuePositionAtOpen` | Where in the confidence-sorted queue this item sat when opened | Whether low-confidence-first sorting concentrates teacher time where `04-compliance-distribution.md` section 11 predicts it should |
| `batchApproved` | Whether this decision was part of a multi-item batch action rather than an individually reviewed item | The batch-approve feature's own real usage rate, distinct from whether it exists in the UI |
| `evidenceTrailViewed` | Whether the reviewer expanded the inline evidence trail (quotes gathered, checks run) before deciding, per `04-compliance-distribution.md` section 11's "show the evidence trail inline" design | Whether the trail is consulted or routinely skipped |

### The adoption outcome and its baseline

Once per pilot semester, before the workspace is introduced, each participating teacher completes a short, five-minute self-report estimating their own typical per-submission grading time on a comparable existing assignment type, the baseline `04-compliance-distribution.md` section 11's "net-save time versus a teacher's current grading workflow" bar is measured against. The adoption outcome is the comparison between that self-reported baseline and the logged `decisionAt` minus `itemShownAt` average per production review over the semester, reported by arm (since only the constrained-AI and full-chatbot arms generate an AI-assisted evidence trail for the queue to display; the no-AI control arm's review queue, if a comparable one exists for that arm's own human-only research submissions, serves as a same-teacher within-subject comparison where a teacher reviews sections in more than one arm). This is `RESEARCH-QUESTIONS.md` Q49's own question, "does the process-exposing class view raise teacher load past a usable threshold," operationalized as a measured time comparison rather than a survey question alone; a short end-of-semester load-and-usefulness survey (Verbert and colleagues 2013's own paired measurement, cited in `RESEARCH-QUESTIONS.md` Q49) runs alongside the logged-time measure rather than replacing it, since a teacher's felt load and a teacher's measured time do not always move together.

### Schema gap

`graph.teacher_reviews` (`supabase/migrations/20260910020000_research_os_teacher_reviews.sql`) carries a `reviewer_id` and a `decision` today, per `LEARNER-STATE-MODEL.md` section 4's own confirmed reading of that migration, with no timing, queue-position, batch, or evidence-trail-viewed columns. This instrument's five fields above are a proposed addition to that table, parallel to the inter-rater columns `src/lib/research-os/EVIDENCE-SCHEMA.md` already proposes for the same table, for `ros-06` to add alongside them rather than as a separate migration.

## What these three instruments share

Every field named above as a schema gap is additive and optional, following the same discipline `EVIDENCE-SCHEMA.md`'s own contract states directly: a writer omits a field it has nothing for, and no existing transition function, review route, or evidence-event reader needs to change to tolerate the addition. None of the three instruments is implemented; this file specifies what `ros-04` and `ros-06` build against, the same relationship `EVIDENCE-SCHEMA.md` holds to `LEARNER-STATE-MODEL.md` section 4.
