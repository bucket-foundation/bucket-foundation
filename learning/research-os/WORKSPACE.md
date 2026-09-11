# Research OS for K-12: The Workspace, Hardened

**Status:** shipped, bead `ros-04`, consent gate and privacy actions added by the `ros-07` follow-up · **Date:** 2026-09-10 · Reads against `learning/research-os/PLAN-REVISION-1.md` section 3 item 4, `src/lib/research-os/EVIDENCE-SCHEMA.md`, `learning/research-os/LEARNER-STATE-MODEL.md` section 4, `src/app/research-os/workspace/page.tsx`, `src/app/api/research-os/workspace/route.ts`, `src/lib/research-os/stages.ts`, `src/lib/research-os/grounding.ts`, `src/lib/research-os/locate.ts`, `src/lib/research-os/organize.ts`, `src/lib/research-os/rate-limit.ts`, `src/lib/research-os/consent.ts`, `src/lib/research-os/profile.ts`, `src/lib/research-os/privacy.ts`, and `src/app/research-os/profile/page.tsx`.

`ros-04` closes what `PLAN-REVISION-1.md` section 3 item 4 named as remaining for Phase 1: the evidence-emission gaps `EVIDENCE-SCHEMA.md` lists, code-level tool contract enforcement to match S1-S7's "verified in code, not just the prompt" floor, and a minimal two-column canvas. This paper states the four contracts, the evidence a call emits, the daily cap, and what the Phase 1 canvas adds.

## 1. The four tool contracts

Each contract is enforced in code, checked by an adversarial test in `scripts/test-research-os-workspace-contracts.ts`, not only by the system prompt a model can ignore.

**Locate** (`src/lib/research-os/locate.ts`, `locateHits`) never calls a model. It is a case-insensitive substring filter over `graph.nodes.title`/`summary`, capped at ten results. Every field on a hit is copied from the matched row; there is no code path that returns text the filter did not find, so an adversarial query narrows or empties the match set and produces nothing else.

**Quote** (`src/app/api/research-os/workspace/route.ts`'s `quote` case) never calls a model either. It reads `src/lib/research-os/passages.ts`'s curated verbatim-passage table for the node; a node with no verified passage falls back to its own seeded summary, labeled `"summary"` rather than `"quote"`, so the client never presents a paraphrase as a citation.

**Check** (`src/lib/research-os/grounding.ts`'s `gradeExplanation`) grades the learner's own explanation against the node's grounding truth and returns a verdict. `GradeResult`'s own type carries `result`, `confidence`, `abstained`, `feedback`, and `citations`, and holds no field for a rewritten explanation. `sanitizeGradeResult` is the code-level enforcement beneath the prompt: an invalid `result`/`confidence` value, or a missing `feedback` string, downgrades the response to the same abstain verdict an unparseable response gets; a citation is kept only when it exactly matches the one allowed source label, stripped every time otherwise, regardless of what the model returned.

**Organize** (`src/lib/research-os/organize.ts`'s `groundOrganizeResult`) relabels the learner's own notes into a claim/evidence/sources scaffold. Every returned item is checked against its own matching input field (`isGroundedInNotes`, a significant-word overlap check); an item with no vocabulary overlap with what the learner wrote is dropped outright. An empty input field forces its output field empty, regardless of what the other fields contain. `abstained: true` reports when nothing survived from real input, distinct from the case where the learner's own input was empty to begin with.

Every contract test in `scripts/test-research-os-workspace-contracts.ts` feeds the tool's pure logic an adversarial prompt or a simulated model response that ignores its own system prompt ("write my claim for me," "finish this sentence," an invented citation, a malformed enum value) and asserts the forbidden content never reaches the response.

## 2. Evidence emitted per action

`src/lib/research-os/stages.ts`'s `EvidenceContext` and the extended `EvidenceEvent` shape (`src/lib/research-os/EVIDENCE-SCHEMA.md`'s own contract) close every gap that file's "Current schema against that plan" section lists, except the two it names as out of scope for `ros-04`: the inter-rater columns on `graph.teacher_reviews` (a future migration, `ros-06`'s scope) and the FSRS/IRT retention join (a separate bead). The two production-review functions, `onProductionReview` (approve) and `onProductionReturned` (return), shipped separately in `ros-06` (PR #28, merged ahead of this branch) and are listed here for completeness; `ros-04`'s own additions are `EvidenceContext` and its five fields (`sessionId`, `learnerText`, `itemId`, `modelFeedback`, `citations`) on every learner-authored transition.

| Action | Evidence kind | `fromStage`/`toStage` | Learner's own text | Model verdict fields | Session id |
|---|---|---|---|---|---|
| Open a node | `open` | Set, may be equal | n/a | n/a | Yes |
| Check | `check` | Set, may be equal | `learnerText` = the explanation | `abstained`, `modelFeedback`, `citations` | Yes |
| Diagnostic probe answer | `check`, `note: "diagnostic_probe"` | `fromStage` is always `"access"` (the cold-start invariant `onProbeCheckResult`'s own header documents) | `learnerText` = the probe answer | `abstained`, `modelFeedback`, `citations` | Yes |
| Transfer item answer | `transfer_item` | Set, equal (held, never advances on its own) | `learnerText` = the answer, `itemId` = the fixed per-target item id | n/a | Yes |
| Production submitted | `production_submitted` | `fromStage` = the row's real prior stage (fetched by `db.ts`'s `loadCurrentStage`), `toStage` always `"production"` | n/a | n/a | Yes |
| Production approved by a teacher | `teacher_review` (`onProductionReview`, `ros-06`) | Both `"production"` (re-affirms the terminal stage) | n/a | n/a | No, teacher-authored |
| Production returned by a teacher | `production_returned` (`onProductionReturned`, `ros-06`) | Both `"production"` (the corrective event `EVIDENCE-SCHEMA.md` names; `stage` never moves backward) | `note` = the teacher's reason | n/a | No, teacher-authored |
| Teacher review of a transfer hold | `teacher_review` | Set | n/a | n/a | No |
| Locate / Organize | n/a (no `graph.nodes` row to attach a state event to) | n/a | n/a | n/a | Logged (see below) |

Locate scans a whole branch, with no single node to attach an evidence row to; Organize works freeform notes with the same gap. `EVIDENCE-SCHEMA.md` defines no evidence kind for either, so both are logged as one structured line per call (`workspace/route.ts`'s `logToolCall`, tool name, learner id, session id, timestamp, and a short result summary), the same discipline the cost-estimate log below already uses for calls with nothing durable to attach to. Quote and Check also get this log line, on top of Check's real database evidence event, so every one of the four tools produces a record of the call even where only some of them produce a stage transition.

"Attempt" is not a separate field: an attempt is one entry in the evidence array, and `sessionId` is what groups a sitting's attempts together, per `EVIDENCE-SCHEMA.md`'s own contract. No API in this codebase can invent a `sessionId`: it is client-generated (`src/app/research-os/workspace/page.tsx`'s `readOrCreateSessionId`, one id per browser tab, kept in `sessionStorage` so a reload mid-sitting keeps the same id) and forwarded verbatim.

A real bug this pass fixed along the way: the workspace page's `saveTransferAnswer` sent `{nodeId, action}` to `/api/research-os/state` and never the learner's own answer text, so `EVIDENCE-SCHEMA.md`'s "no stored transfer-item answer" gap was unclosable from the client side no matter what the server accepted. The client now sends `answer` and a fixed `itemId`, and the server requires `answer` on a `transfer_item` action rather than silently accepting an empty one.

## 3. The daily cap

`src/lib/research-os/rate-limit.ts` adds a per-learner daily cap on the four workspace tool calls, distinct from the existing per-minute burst limiter in `workspace/route.ts`. `RESEARCH_OS_DAILY_TOOL_CAP` (default 200) resets at UTC midnight; a call over the cap returns 429 with a message naming the cap and when it resets. The cap is in-memory, the same best-effort posture the burst limiter and `writeEdgeFlags` already carry in this codebase: a serverless cold start or a multi-instance deploy resets or fragments the count. A durable, cross-instance cap belongs in the Viatika metering layer (`CLAUDE.md` priority 6), the same TODO `/api/academy/tutor` already carries; this is the Phase 0/1 floor.

Check, Organize, and the diagnostic probe also log a best-effort per-call cost estimate (`llm.ts`'s `logToolCost`) from the provider's own reported token usage, at the per-million-token rates the system review's cost model cites (Sonnet 5 $2.00/$10.00, Haiku 4.5 $1.00/$5.00, input/output). The estimate logs as `null` when the provider reports no usage: a missing figure stays visibly missing. The log records spend; no spend is blocked or charged from it.

## 4. What the Phase 1 canvas adds

The single vertical chain list becomes a two-column layout at `src/app/research-os/workspace/page.tsx`, under 1024px width it stacks to one column, matching the phone-width requirement with no horizontal scroll.

The left column is the routed chain: unchanged in substance (one stop per prerequisite node, a stage badge each), with one addition, a `needs review` badge on any step whose own edge toward the target fell below the routing confidence floor (`ros-03`'s `lowConfidenceFlags`, carried by `GET /api/research-os/route` since PR #27). The badge's title attribute states the edge's confidence and why it is flagged, so the same information reaches a screen reader and a sighted learner.

The right column is the learner's own workspace: the selected node's summary, the four tools, a free scratch notes area (a local-device convenience, persisted to `localStorage` per target, kept off the server), the running "sources I have quoted" list (client-accumulated from each Quote response, most recent first, one entry per node), the transfer item when the target is selected, and the Production form.

Two design choices follow the HCI literature the `ros-04` reading list named. Horvitz 1999's mixed-initiative framing already governs when the diagnostic probe fires versus waiting for the learner (unchanged by this pass); this canvas keeps that split legible by never auto-opening a tool panel, every action stays learner-initiated. Marshall and Shipman 1995's spatial hypertext and Pirolli and Card 1999's information foraging both warn that a system-computed layout, routed by frontier-backward routing on the router's own arrangement, has to earn its sensemaking benefit through its own evidence, since spatial hypertext's sensemaking benefit was measured on user-authored layouts. The two-column split keeps the system's own routing decision (the chain, left) visually separate from the learner's own accumulating work (right), a legible boundary a learner can read: this side is the system's claim about my position, this side is my own material.

No drag-and-drop, no free node placement, no pan/zoom: the system review's own "pannable, zoomable canvas" description names those as a later step, past this pass's scope. Every interactive element here is a real `<button>`, `<input>`, `<textarea>`, or `<label>`, reachable and operable by keyboard alone with no custom key handling required.

## 5. The consent gate and self-service privacy actions

`ros-07`'s follow-up ("consent gate wiring") puts `src/lib/research-os/consent.ts`'s `requireConsent` in front of every write this workspace can make, both server-side and, for the learner, visibly on the workspace page itself.

Server-side, every gated route calls `requireConsent` right after its own `verifyLearner()` check and returns `consentBlockedBody(gate)` as a 403 JSON body when it is not allowed: `POST /api/research-os/workspace` (all four tools, action `"workspace_tool"`), `POST /api/research-os/probe` (action `"probe_answer"`), `POST /api/research-os/state` when `action === "transfer_item"` (action `"transfer_answer"`, the sibling `"open"` action stays ungated), and `POST /api/research-os/production` (action `"production_submit"`). See `learning/research-os/compliance/README.md`'s "The consent gate, wired" for the full call-site list and the reason each choice was made.

Client-side, this page's `handleConsentResponse` recognizes that 403 shape from any of Locate, Quote, Check, Organize, the diagnostic probe answer, the transfer-item answer, or a Production save, and renders it as a banner above the routed chain instead of a raw error string. A `"no_profile"` block carries a link to `/research-os/profile`, the minimal role and birth-year-bucket form (`src/lib/research-os/profile.ts`'s `validateProfileInput`, `POST /api/research-os/profile`); that route writes `role` and `birth_year_bucket` only, never `consent_status`, which stays the school/parent consent path's job (still a TODO, see `compliance/README.md` part B item 2).

The page's footer adds two self-service actions against `POST /api/research-os/privacy` (PR #35's export/delete route): "export my data" downloads the caller's own export envelope as a JSON file, and "delete my data" opens a typed confirm step, the button stays disabled until the learner types the exact confirm phrase, before calling the route with `confirm` set. The route itself checks `isDeleteConfirmed` before any auth resolution or database work, so the confirm step holds on the server even if the page's own disabled-button state is ever bypassed.

## 6. Faded Guidance

`GET /api/research-os/route`'s response gains `guidance` (`GuidanceLevel | null`, `src/lib/research-os/guidance.ts`); the workspace page reads it to decide how much of the selected node's own worked example (`GraphNode.workedExample`) to show above the Check tool's explanation box, the full text at `high`, the first half at `medium` (`worked-examples.ts`'s `firstHalfOfWorkedExample`), nothing at `low`. The Check action recomputes the level authoritatively server-side rather than trusting whatever the page last rendered, and returns its own `guidance` value on every Check response so the two stay consistent after a Check moves the learner's stage. Full account, the base level, the fading schedule, the class arm switch, and what gets logged: `learning/research-os/GUIDANCE.md`.
