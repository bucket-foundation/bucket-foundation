Research OS Integration
========================

A question-by-question map from `learning/research-os/RESEARCH-QUESTIONS.md`
(the PR #3 branch, `feat/research-os-k12`) onto the engine this repo ships:
which of its 49 questions the engine can run as a campaign today against
`hte.corpus.education_atlas`, which need a new corpus adapter, and which sit
outside what a belief-fusion-and-tournament engine over a slot-filled address
space can answer at all. `K12-INTEGRATION.md` covers the corpus and the
`hypothesize` tool shape. The plan's own research agenda, and the two
systems' shared and separate data needs, are the subject here.

## The central finding

None of the 49 questions asks the kind of question `education_atlas.load()`
is built to answer: did a named country's indicator move, and by what
mechanism, with what evidence. Every question in the file is about the
workspace, the learner, or the engine's own calibration instead. The one
real bridge between the two research agendas is the production record
(`PLAN.md` section 5): once Research OS accepts a student production, it is
an evidence item the engine can fuse, and the engine's ranked hypotheses and
gap nodes become routing targets Research OS can point a learner at. Outside
that one seam, the two systems answer different kinds of questions with
different kinds of data.

## Question map

**Changed since revision 0** (`learning/research-os/PLAN-REVISION-1.md`,
2026-09-10, reading PRs #3 through #30 against this file's own last pass).
Three registrations landed since this table was last drawn: `literature`
(`hte.corpus.literature.load_default`) is now registered in both
`_CORPUS_LOADERS` dicts and carries a second, six-card fixture batch
(`bkt-hte-literature-batch-two`, PR #15's own 31-paper, five-area intake
pass, adding a fifth area, `prerequisite-knowledge-graphs`, absent from
batch one); `research-os` (`hte.corpus.research_os_outbox.load`, ros-12
item 2) already read unconsumed accepted-production rows before this
revision, but a row can now originate from a real teacher decision rather
than only a fixture, since `ros-06`/PR #28 shipped the accept path and
PR #14/#30 shipped the bridge that carries an accepted row to the outbox
table (`ENGINE-BRIDGE.md`, "Stubs Closed: ros-12 and ros-13"). Three
questions move class as a direct result: question 19 and question 22 move
from "needs adapter" to runnable today; question 20 drops "blocked on
engine wiring" (`ros-12` item 4's gap-node export is built and applied)
and reads as out of scope instead, the same bucket every other
classroom-outcome question already sits in, since what remains once the
wiring closed is a Research-OS pilot measurement no adapter supplies.
Question 23 keeps its old "runnable in a same-family form" reading, now
against two corpora instead of one. Every other question's class is
unchanged; where batch-two literature evidence bears on a question's own
design without changing what the engine itself can run, that evidence is
named in the Reason column rather than moving the Class column.

Classification key: **runnable today** (the engine can run this now
against a named corpus: `production`, `research-os` (the outbox reader,
called `research-os-outbox` below where the distinction from `production`
matters), `literature`, or `education-atlas`; `sacred-history` joins this
list once its own `hte.corpus` adapter lands, not yet true on `main`),
**needs adapter** (the engine could answer this once a new corpus,
evidence source, or Research-OS-side instrument exists), **out of scope**
(an individual-learner, classroom, or product question no slot-filled
address space and belief score answers; it needs a knowledge-tracing
model, an RCT, or a survey instead).

### Learner states

| # | Question | Class | Reason |
|---|---|---|---|
| 1 | Five states map onto ICAP or a distinct construct | out of scope | An IRT or Rasch fit on Research OS's own activity logs; no country, indicator, or mechanism slot to fill. |
| 2 | State predicts forward learning rate | out of scope | A knowledge-tracing comparison over per-learner logs. |
| 3 | Misclassification and contest rate | out of scope | An audit of Research OS's own classifier output. |
| 4 | Production state transfer to unfamiliar formats | out of scope | A transfer study on individual learners. |

### Routing

| # | Question | Class | Reason |
|---|---|---|---|
| 5 | Frontier-backward routing versus forward route, time-to-Understanding | out of scope | A within-class randomized route assignment; the engine supplies only the routing target, and the outcome measure belongs to Research OS's own study. |
| 6 | Routing from a gap node changes engagement | out of scope | The engagement half is a Research OS outcome. The "does routing from a gap node produce usable productions" half depends on the gap-node queue reaching `hte.runner` at all; see Engine overlap, question 20, below. |
| 7 | Expertise-reversal scaffolding schedule | out of scope | An instructional-design factor on individual learners. |

### The constrained AI

| # | Question | Class | Reason |
|---|---|---|---|
| 8 | Three-arm RCT on delayed post-tests | out of scope | A learner-level RCT. |
| 9 | Quote-tool fabrication rate and abstain firing | out of scope | An adversarial audit of Research OS's own find and quote tools, built in a different codebase from the engine's `extract` role. `hte.roles.extract`'s span-anchoring (never trusting a model's own character offsets; dropping an unlocatable quote rather than fabricating its span) is the pattern worth carrying into those tools. |
| 10 | Lateral-reading change | out of scope | A civic-online-reasoning study on learners. |
| 11 | Cognitive-offloading effect of check | out of scope | A learner cognition study. |

### Productions and payments

| # | Question | Class | Reason |
|---|---|---|---|
| 12 | Student productions meet a research-grade evidence standard | out of scope | A blind human rating exercise against the engine's tiers, the precursor Question 19 needs before it can run. |
| 13 | Payment changes production quality or crowds out motivation | out of scope | A payment-condition RCT on learners. |
| 14 | Payout structure guardians and districts accept | out of scope | A legal and policy survey with no engine dependency. |

### Teacher view

| # | Question | Class | Reason |
|---|---|---|---|
| 15 | Process signals that change teacher decisions | out of scope | A think-aloud and telemetry study on Research OS's own dashboard. |
| 16 | Exposing state confidence changes teacher trust | out of scope | A teacher-trust HCI study. |

### Distribution and adoption

| # | Question | Class | Reason |
|---|---|---|---|
| 17 | Librarian versus teacher channel | out of scope | An adoption-speed comparison across pilot sites. |
| 18 | Certification changes district willingness | out of scope | An adoption study with no engine dependency. |

### Engine overlap

| # | Question | Class | Reason | Slot frame |
|---|---|---|---|---|
| 19 | Detectability and tier for a reviewed production; do productions move rankings in a calibrated direction | runnable today (`production`; `research-os-outbox` once a real accepted production exists) | The campaign itself is `hte.calibrate.run_holdout` with and without production evidence, which the engine already runs for its two shipped corpora. `hte.corpus.production` reads a local fixture directory or a live Supabase table; `hte.corpus.research_os_outbox` reads the same shape off the real accepted-production pipeline (`ros-06`/PR #28's accept path, PR #14/#30's bridge). A PR #30 review pass chained the pure legs of that pipeline against a fixture shaped exactly like a real accepted row (`ENGINE-BRIDGE.md`, "Stubs Closed"); the one leg still untested is the live Supabase read and write itself, no live instance being available in a review sandbox. | Once ingested: ACTOR = the production's `slots.actor` or `OTHER`; ACTION = `slots.action` or `OTHER`; OBJECT = the atom's own concept; PLACE = `slots.place` or `OTHER`; MECHANISM = `slots.mechanism` or `OTHER`; TIME = the atom's own period; the submission date plays no role. |
| 20 | Gap-node queue as a curriculum | out of scope | `hte.unknowns.GapNode`, `value_of_information`, and `active_priority`'s public generalization, `unresolved_slot_gaps`, are wired now (`ros-12` item 4): `scripts/campaign_research_os.py`'s `export_gap_nodes` calls it after every campaign, and `apply-engine-campaign.ts` writes each gap as a `graph.nodes` row a class can be assigned as a routing target. The engine-side blocker this row used to name is closed; what is left is purely a Research-OS pilot measurement, "does assigning gap nodes to classes fill them faster than the engine's own active-learning loop," the same class of classroom-outcome question every other "out of scope" row in this file already sits in, and no adapter changes that. |
| 21 | Artifact-validity instrument predicts fusion weight | needs adapter | The production-record dependency question 19 named is resolved (`production`, `research-os-outbox`); what is still missing is the validity-rating instrument itself, `RESEARCH-QUESTIONS.md` Q21's own citation (Auchincloss and others 2014) names the course-based-research field as not having built one yet, so no production carries a validity-rating field to correlate against fusion weight until Research OS's own review flow adds one. |
| 22 | Isolated-quote versus full-document-context checking on productions | runnable today (`literature`; `quantum-history` as the original, no-production generic form) | The overlap map's own question 6 (`_intake/research-os-k12/OVERLAP-RESEARCH-OS-AND-AI-FOR-RESEARCH.md`) names this as a comparison the engine's own held-out corpus can already answer, no production required, before the same comparison ever runs on production data. `literature`'s own evidence spans are the real, DOI-verified academic quotes this question is asking about, a closer fit than `quantum_history`'s chapter prose; batch two adds Binz and Schulz (2023)'s finding that a model's reasoning swings with small phrasing changes as tangential support for distrusting a single-pass check at either setting (`PLAN-REVISION-1.md` §2d). | No hypothesis-level slot frame; the comparison runs at the evidence-item level, one corpus's own `_extraction_text`/scoped span quote against its `_full_card_text`, and the unit of comparison is agreement across the whole held-out population rather than one placement. |
| 23 | Cross-family versus same-family judge on held-out placements | runnable today (same-family only, against `literature` or `quantum-history`; cross-family still blocked) | `hte.llm.complete` shells out to the `claude` CLI only; `hte/data/model-policy.json` picks a model per role but every choice is a Claude tier (sonnet, haiku, opus), never a second provider. A same-family comparison (sonnet judge versus opus judge) is a one-line policy edit, runnable today against either `quantum_history`'s or (a closer subject match) `literature`'s own held-out placements; the cross-family half `PLAN.md` §10 asks for still needs `hte.llm` extended to call a non-Anthropic model first. `PLAN-REVISION-1.md` §3 item 12 flags Binz and Schulz (2023)'s own single-pass fragility finding as "a candidate addition to its existing calibration-cadence item," the same `PLAN.md` §10 line this row has always depended on. | No single-hypothesis slot frame applies either way; the unit of comparison is the whole held-out population's calibration across every placement. |
| 24 | Re-scoring cadence and reviewer training versus the fusion rule | needs adapter | The schema dependency is resolved (`review.teacher`/`review.bucket_reviewer` already reach the engine through `production`/`research-os-outbox`); what is still missing is a logged reviewer-training manipulation, more than one reviewer condition recorded against the same productions, which no pilot has run yet. |
| 25 | Reliability-weighted student slot extraction, a Galaxy Zoo pattern | needs adapter | A production's own `slots` block already carries the same five fields the engine fills, and the ingestion path is registered on both corpora; this question needs *volume*, many students' filled slots on the same shared evidence, not yet in hand at fixture or single-pilot scale. The same volume ceiling `PLAN-REVISION-1.md` §4 names for its own question 4 (Production is the rarest of the five states) applies here directly. |
| 26 | Which frontier nodes attract routing, and does the generator track that traffic | needs adapter | Needs Research OS's own routing-event log as a second time series beside the engine's regular corpus; no adapter this package ships reads product telemetry. Batch-two evidence sharpens the framing without closing the data gap: the overlap map's own question 11 reads Kitano (2021)'s graded discovery spectrum as a way to score whether a routed gap node produced a confirming production or a gap-closing one, which is what "attract routing" should end up meaning here. |
| 27 | Locking evaluation criteria before check runs, a Registered Reports pattern | needs adapter | Named as a property of "a production's evaluation criteria" in the question text; needs a lock-before-check workflow step in the production pipeline itself before it is testable as stated, a Research-OS-side feature no corpus adapter substitutes for. |

### From the AI-for-science literature

Questions 21, 22 (as stated), 24, 25, and 27 above are drawn from this
literature review; the table above already carries them. Question 22 now
runs today against `literature`, a real-paper corpus this same review
seeded; the remaining four still need either a production or a
Research-OS-side instrument or workflow step, each named above.

### From the educational-methods literature

| # | Question | Class | Reason |
|---|---|---|---|
| 28 | Do the five states form one latent trait | out of scope | An IRT or Rasch fit on Research OS's own state items. |
| 29 | Frontier-backward routing beats forward sequencing on retention | out of scope | A learner RCT. |
| 30 | Payment changes self-explanation and struggle behavior | out of scope | A three-condition learner RCT. |
| 31 | Share of productions that are net-new synthesis | out of scope | A blind expert coding pass on production content, the same kind of exercise question 12 needs. |
| 32 | Teacher access to state data changes grouping decisions | out of scope | A classroom RCT on teacher behavior. |
| 33 | FSRS intervals differ by state | out of scope | An Academy spaced-repetition tuning question with no engine dependency. |
| 34 | Population-average versus individualized mastery misrouting | out of scope | A knowledge-tracing simulation, a different statistical object from a slot-filled hypothesis. |
| 35 | Expertise reversal crossing the five states | out of scope | A scaffold-intensity RCT on learners. |
| 36 | Rate of check queries turned into indirect answer requests | out of scope | Transcript coding of Research OS's own product usage. |
| 37 | Sourcing skill transfers to open-web evaluation | out of scope | A learner transfer study. |
| 38 | Minimum engagement rate before a detectable gain | out of scope | A dose-response field study on learners. |
| 39 | Payment eligibility changes participation by achievement or income | out of scope | An equity and participation study. |

### From the HCI and human-AI collaboration literature

| # | Question | Class | Reason |
|---|---|---|---|
| 40 | Mandatory check versus unchecked note-taking on transfer | out of scope | A learner RCT. |
| 41 | Disagreement surfacing raises source engagement | out of scope | A product-usage RCT. |
| 42 | The AI ghostwriter effect in organize | out of scope | An authorship-perception survey. |
| 43 | System initiative level by age band | out of scope | A developmental HCI comparison. |
| 44 | Check-only versus check-plus-fix critic | out of scope | A learner RCT on error correction. |
| 45 | Children over-trust a verified badge | out of scope | A child-HCI trust study. |
| 46 | Exposing belief-score components changes teacher trust | out of scope | A teacher-trust HCI study; the components themselves, `Opinion`'s `(b, d, u, a)` and its projection `P(h) = b + a*u`, already exist in `hte.belief.score` and need only a UI to surface them. |
| 47 | Eight- and sixteen-year-olds generate different requirements | out of scope | A cooperative-inquiry requirements study. |
| 48 | A paid, citable production model shifts learner identity | out of scope | A longitudinal survey. |
| 49 | The process-exposing class view raises teacher load | out of scope | A teacher-load HCI study. |

### Count

Runnable today: 3 (questions 19 and 22, against `production`/
`research-os-outbox` and `literature` respectively; 23, same-family only,
against `literature` or `quantum-history`). Needs a new adapter: 5
(questions 21, 24, 25, 26, 27), none of them blocked on a production
adapter any longer, each blocked instead on a Research-OS-side instrument,
manipulation, telemetry stream, or workflow step named in its own row
above. Out of scope for hypothesis generation: 41, one more than
revision 0's count: question 20's engine-wiring blocker closed (`ros-12`
item 4), so it now reads as a Research-OS pilot question like every other
row in this bucket, rather than a distinct "blocked on engine wiring"
class this file no longer needs.

## The bucket-mcp `hypothesize` tool

`PLAN.md` never names an MCP tool, a schema, or a request and response shape
of its own. Its interface language is two sentences: section 3 says the
router's `target` parameter can point at "a live hypothesis from the
hypothesis engine's ranked tournament," and section 5 says "the engine's
ranked hypotheses and its gap-node queue... are frontier targets for
routing." `K12-INTEGRATION.md`'s `hypothesize` tool, corpus in, a ranked
timeline and a `gap_nodes` list out, is exactly the read the router needs to
resolve a `target` into an address. Keep its shape as documented; nothing in
`PLAN.md` asks for a different one.

What `PLAN.md` names that `hypothesize` does not yet cover is the write
direction: section 5's "an accepted production becomes an evidence item...
and is scored like any other item." A read-only campaign tool cannot ingest
a production. Closing that seam needs one of two additions, an `ingest_
production` tool beside `hypothesize`, or a `productions` parameter on
`hypothesize` itself that folds a batch of accepted records into the corpus
before the campaign runs. Either shape is a bead for whichever change
registers `education-atlas` in `_CORPUS_LOADERS`; this file names the gap
rather than picking between them.

## Milestones the engine feeds

This table reads against `PLAN-REVISION-1.md` §3's own revised, dependency-
ordered Phase 1 list instead of the original `PLAN.md` §11 numbering: four
items that list already marks shipped (production envelope schema, the
graph schema, the Access-stage gate, and the frontier-backward routing
algorithm, all landing in PR #6) are struck from `PLAN.md` §11's original
scope and do not repeat here either.

| `PLAN-REVISION-1.md` §3 item | Engine artifact | How |
|---|---|---|
| Phase 0 exit test: "a learner can route backward from one engine hypothesis... and submit a production the engine ingests" | Timeline of hypotheses with opinions; gap nodes | The router's `target` resolves against the ranked timeline or a gap node; the corpus behind Phase 0's find tool is `quantum/07-history`, the same corpus the engine already ingests. Gated on blocking decision 1 (`PLAN-REVISION-1.md` §3): whether Phase 0's own front door stays the shipped sky-blue grades 3-5 path or moves to this corpus. |
| Item 2, `ros-03`, route API target parameter, revised per §2b's confidence-weighted edges | Timeline of hypotheses with opinions; gap nodes | Same resolution path as the Phase 0 exit test; unchanged from revision 0 beyond the confidence-weight addition, which lands entirely Research-OS-side (`computeFrontier`) rather than in the engine. |
| Item 4, `ros-04`, four-tool workspace hardening | Timeline of hypotheses with opinions | `find`'s retrieval surface over the Phase 0 subject is the engine's own evidence base for that corpus; the Phase 0 vertical slice itself (PR #6) already ships against a 22-node seed path, a different corpus than Phase 0's own `quantum/07-history` name, per blocking decision 1. |
| Item 5, `ros-06`, teacher class view including an accept path | **Shipped, PR #28.** `/api/research-os/review`'s POST flips a submitted production to `"accepted"` and calls `emitProductionOutboxIfAccepted`; a real reviewer decision reaches the outbox now, not only a fixture. | This is the milestone every downstream engine-bridge stub depended on (`ENGINE-BRIDGE.md`); `research-os-outbox` corpus loads read this path's own real output once a teacher accepts a production. |
| Item 6, `ros-05`, production schema and engine adapter, remaining half | `production`/`research-os-outbox` corpora; question 19's holdout campaign | The outbox write path and the engine-side normalizer (`Production.from_dict`'s `is_research_os_record`/`normalize_research_os_record`) both exist (PR #10, PR #14); what remains is exercising the path against a real accepted production end to end, which needed item 5 first and is now unblocked. |
| Item 7, `ros-12`, wire the engine bridge stubs | Campaign export, gap-node export | **Shipped, PR #14/#30.** `campaign_research_os.py`'s `run()` registers a corpus into `hte.runner._CORPUS_LOADERS` at call time and runs one campaign; `export_gap_nodes` calls `hte.unknowns.unresolved_slot_gaps` after every run. Both outputs feed `apply-engine-campaign.ts`, which writes `engine_hypothesis`- and `gap`-typed `graph.nodes` rows back onto Research OS's own graph. |
| Item 9, `ros-08`, evidence infrastructure and pre-registration | Self-report | The engine's own calibration summary and target-blind check are the nearest existing precedent for the pre-registration record Research OS's own study needs to publish; depends on items 1 (state model), 4, and 6 above per `PLAN-REVISION-1.md` §3, plus the IRB-of-record university partner §5 names as an open founder question. |
| Item 12, `ros-11`, hypothesis-engine changes from the AI-for-science review | None; the flow runs the other direction here | Research OS's literature review hands bead candidates to the engine; `PLAN-REVISION-1.md` §3 item 12 names Binz and Schulz (2023)'s own single-pass fragility finding as a batch-two candidate addition to this item's existing calibration-cadence ask. |

An emitted paper (`papers/history-hypothesis-engine/main.tex`, tracked by
its own bead) feeds no milestone directly today. The nearest link is
`PLAN.md` §10's own ask for calibration "on a fixed published cadence,
CASP-style": a published calibration record is exactly what would let
Phase 1's pre-registered study and Phase 2's Common Sense and Digital
Promise reviews cite the engine's own track record instead of the raw
tournament output. Neither `PLAN.md` nor `PLAN-REVISION-1.md` names that
citation path yet.

## What the engine needs from Research OS

**Identity.** An opaque contributor or reviewer id, enough to weight a
source by track record (question 25) and to carry the named human sign-off
section 10 asks for. No student name, age, or guardian record. The engine
already models provenance through `hte.evidence.Source`; a production's
author needs no field beyond what that record already carries.

**Rostering.** Nothing directly. A classroom is a Research OS concept the
engine's address space has no node for. If gap-node assignment ships
(question 20's wiring), the engine needs only an assignment-and-fill signal,
which gap node, filled or not, and when, never a roster, an LTI session, or
a Clever or ClassLink record.

**Payments.** Nothing. A production's `payout` block (`payee_type`,
`ledger_ref`) never reaches the engine; belief fusion weights a production
by its tier and detectability, set by review outcome, never by whether or
how much it was paid. x402, Dynamic, the CDP facilitator, and Stripe all sit
outside the engine's own module map.

**Data services.** The engine already shares one line of `03-data-services.md`
with Research OS: Anthropic's API (section F), the same budget line every
`hte.roles` call and every one of Research OS's four tools draws against.
Everything else diverges. `education_atlas.py`'s own sources, World Bank,
UNESCO UIS, OWID, and PISA, arrive through the sibling `education-atlas`
repo's own pipeline and are not named as their own rows in
`03-data-services.md`; only Our World in Data (section B) documents a
shared lineage with one of them. Research OS's find tool reads OpenAlex,
Crossref, Unpaywall, Europe PMC, PubMed, arXiv, and Wikidata directly; the
engine calls none of them. If a production cites one of those sources, it
reaches the engine as a citation string inside `evidence_spans`, a
`canonical_url` and a `source_id` the engine stores and matches against,
never a live call the engine makes on its own.

## What the engine does not touch

No student PII. No roster, SIS, or LMS data (Clever, ClassLink, Google
Classroom, Canvas, Schoology, Moodle, PowerSchool). No consent or age-gate
flow (PRIVO, k-ID, the COPPA verified-parental-consent path). No payment or
wallet data (x402, Dynamic, the CDP facilitator, Stripe, Coinbase Commerce).
No compliance tooling (Vanta, Drata, iKeepSafe, the SDPC agreement, Common
Sense Privacy). No infrastructure choice Research OS makes for its own
hosting (Vercel, Cloudflare, Sentry, PostHog, Resend), except that a
production must live somewhere, Supabase, before an adapter can read it.

## Production adapter

The gap this file's own "Engine overlap" table named, a production record
with no ingestible shape, is closed: `hte.corpus.production` reads the
JSON shape `docs/PRODUCTION-SCHEMA.md` defines (a strict restructuring of
`PLAN.md` §5's own YAML, one production holding many claims instead of
one claim per record) into an `hte.corpus.Corpus`, either from local JSON
files (`load`) or from a live Supabase deployment (`load_supabase`,
`03-data-services.md` section J). Fourteen fixture productions under
`hte/data/production-fixtures/` exercise all seven of questions 19, 21,
22, 24, 25, 26, and 27 across three grade bands and two districts,
including a citation chain of depth two (one production citing a second,
which itself cites a third) and one production retracted after
acceptance: twelve `PRODUCTION-SCHEMA.md`-shaped `prod-*.json` files plus
`research-os-sky-blue.json`'s two `graph.productions`-shaped rows
(`docs/PRODUCTION-SCHEMA-ALIGNMENT.md`), `production.load_raw()`
normalizing the latter onto the former's own shape before either reaches
`_build_corpus`.

The corpus is registered (`bkt-hte-corpus-registration`), the same line
`K12-INTEGRATION.md` names for `education-atlas`, added to both
`_CORPUS_LOADERS` dicts:

```python
_CORPUS_LOADERS["production"] = production.load
```

Question 19's own holdout campaign, "does adding productions change
hypothesis rankings in a calibrated direction," runs the same way a
`quantum-history` or `education-atlas` campaign runs:

```bash
cd tools/hypothesis-engine
python3 -m hte.cli campaign run --corpus production --seeds 3
```

`--corpus research-os` (`hte.corpus.research_os_outbox.load`, ros-12 item
2, registered alongside `production` in both `_CORPUS_LOADERS` dicts)
runs the same holdout campaign over the live, real pipeline instead of a
fixture directory: it reads `public.research_os_productions_outbox`'s
own unconsumed rows, one per production a teacher has accepted through
`ros-06`/PR #28's own accept path, through this same normalizer.
`load()` only reads; a caller that goes on to use the corpus calls
`mark_consumed()` itself, or calls `load_and_consume()` for the "read and
immediately commit" shape `scripts/campaign_research_os.py` builds on.

Unlike the other three shipped corpora, `production`'s own ground truth
carries a real discovery lag: `GroundTruthEvent.discovery_year` is the
date a claim's production was accepted, distinct from the claim's own
subject date (`_build_corpus`'s own docstring in `hte/corpus/
production.py`). `hte.calibrate.choose_holdout_mode` reads that lag as
informative and keeps discovery-date holdout for this corpus
(`bkt-hte-calibration-redesign`), the one shipped corpus where it does;
`quantum-history`, `education-atlas`, and `fixtures` all fall back to
k-fold evidence holdout instead, `discovery_year == year` for every
event they ship.

### The write-side hook

Everything above is the read side: a production already accepted into
Research OS's own graph, read into a campaign. `PLAN.md` §5's other
direction, "an accepted production becomes an evidence item... and is
scored like any other item," needs a write path this file's own "The
bucket-mcp `hypothesize` tool" section named but did not build: a
`hypothesize` result written back to the production that prompted it.

The shape matters here, without the wire code (`bucket-mcp.py` stays
untouched, per that section's own seam-not-cut rule): once a production's own citation
(a `source_id` naming an external source or another production, per
`PRODUCTION-SCHEMA.md`) enters a campaign and that campaign finishes, the
result Research OS would write back onto that production's own record is

```json
{
  "hypothesize_result": {
    "run_dir": "runs/production/2026-09-10T12-00-00Z",
    "address": {"actor": "student-researcher", "action": "raised", "object": "tier-assignment", "place": "classroom-workspace", "mechanism": null, "time_bin": "2026"},
    "posterior_before": 0.52,
    "posterior_after": 0.71,
    "tier_assigned": "T3",
    "detectability": 0.64,
    "moved_ranking": true,
    "self_report_flagged": false
  }
}
```

`posterior_before`/`posterior_after` and `tier_assigned` are exactly
question 19's own holdout comparison, read off the same `timeline.json`
`hte.export.write_views` already writes; `moved_ranking` is a boolean
derived from comparing the hypothesis's Elo rank before and after this
production's own evidence entered fusion, the same distinction `docs/
K12-INTEGRATION.md`'s slot-frame table draws for question 19 between a
tier move and a rank move. Writing this back onto the production's own
row is Research OS's own job; `hte.corpus.production.load_supabase`
only reads the row, it never writes one.

## Calling the engine

`hte.api.hypothesize` (`hte/api.py`) is the one function everything above
routes through: a production record or a list of them in, the ranked
timeline, gap nodes, coverage, surprise items, and self-report out.
`hte/serve.py` puts an HTTP face on it; `hte/mcp_tool.py` names the tool
shape bucket-mcp registers to reach that face. No wiring here touches
`bucket-mcp.py` itself, the same seam this file names throughout.

Start the server in fake mode, no `claude` CLI, no network, against the
shipped fixtures:

```bash
cd tools/hypothesis-engine
python3 -m hte.serve --port 8420 --fake
# or, once installed: hte-serve --port 8420 --fake
```

Call it with the 14 shipped production fixtures:

```bash
python3 -c "
import json
from hte.corpus import production
records = [p.to_dict() for p in production.load_raw()]
print(json.dumps({'productions': records, 'status_min': 'draft', 'seeds': 1, 'max_hypotheses': 20}))
" > /tmp/hypothesize-request.json

curl -sf -X POST http://127.0.0.1:8420/hypothesize \
  -H 'Content-Type: application/json' \
  --data @/tmp/hypothesize-request.json | python3 -m json.tool
```

`GET /health` returns `{"ok": true, "status": "healthy"}` with no
campaign run. `hte/serve.py` carries no authentication of any kind: bind
it to `127.0.0.1` and let whatever process starts it alongside bucket-mcp
own the trust boundary; bucket-mcp is the only intended caller.

`hte/mcp_tool.py`'s `TOOL_DEFINITION` is the `hypothesize` tool
bucket-mcp registers, an HTTP call to the server above from bucket-mcp's
own tool handler:

```typescript
import { TOOL_DEFINITION } from "./hypothesize-tool.json"; // hte/mcp_tool.py's TOOL_DEFINITION, exported once as JSON

const HTE_SERVE_URL = process.env.HTE_SERVE_URL ?? "http://127.0.0.1:8420";

server.registerTool(TOOL_DEFINITION.name, TOOL_DEFINITION, async (input) => {
  const res = await fetch(`${HTE_SERVE_URL}/hypothesize`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(input),
  });
  const body = await res.json();
  if (!res.ok || body.ok === false) {
    return { isError: true, content: [{ type: "text", text: body.error ?? `hte-serve returned ${res.status}` }] };
  }
  return { content: [{ type: "text", text: JSON.stringify(body) }] };
});
```

## Literature adapter

`hte.corpus.literature` reads the literature corpus PR #5 shipped
(`_intake/research-os-k12-literature/`, now grown to 82 DOI-verified
papers across five areas by PR #15's own "batch two") into a fourth
`Corpus`, next to `quantum_history`, `education_atlas`, and `production`.
One `Source` per card, keyed by its own DOI; `EvidenceItem`s from each
card's `key_claims` bullets, a real span pointing at the checked-in
file's own line range and quote; a `GroundTruthEvent` when a card is a
meta-analysis or reports a replication directly; a stemma edge when a
card cites another card in the same corpus by its own first author. The
full mapping, plus the multi-batch design this section names below,
lives in `hte/corpus/literature.py`'s own top docstring.

This closes a gap the question map above names twice, without moving
either question's own class at the time this paragraph was first written
(both have since moved, see the question map's own "Changed since
revision 0" note): question 22, "isolated-quote versus
full-document-context checking on productions," already ran a generic,
no-production version "over `quantum_history`'s own evidence spans"; that
generic run gained a second, closer-fitting corpus, since `quantum_
history`'s own spans are chapter prose about ancient history and
`literature`'s own spans are the real, DOI-verified academic quotes the
question is asking about. Question 23, "cross-family versus same-family
judge on held-out placements," gained the same second option, gated on
the same engine-side blocker `hte.llm.complete`'s Claude-only model policy
sets for its cross-family half either way.

Two of `_intake/research-os-k12/OVERLAP-RESEARCH-OS-AND-AI-FOR-RESEARCH.
md`'s own twelve closing questions cite papers this corpus now carries as
ingestible sources rather than prose citations alone. Its question 2
(Bloom 1984, VanLehn 2011, Kulik and Fletcher 2016; extends
`RESEARCH-QUESTIONS.md` Q8) and question 9 (Roediger and Karpicke 2006;
extends `RESEARCH-QUESTIONS.md` Q2 and Q33) both name papers a
`literature` campaign can hold out and calibrate against directly today.
Bloom 1984's own two-sigma claim and Kulik, Kulik, and Bangert-Drowns
1990's own meta-analytic correction of it, a real stemma edge and a real
`GroundTruthEvent` dated 1990, is the corpus's own worked example: a
`hte.calibrate.run_holdout` pass over `literature` tests whether the
engine's belief fusion favors the later, larger-sample correction over
the earlier, smaller-sample claim, the same question question 2 asks of a
constrained-AI workspace, one level down, over the engine's own citation
graph instead of a classroom. No question this corpus touches reaches a
real K-12 learner or classroom; every "out of scope" question above stays
out of scope here too, for the same reason it did before this adapter
existed.

### Batch two and multi-batch loading

Bead `bkt-hte-literature-batch-two`. PR #15 added 31 new cards plus one already-drafted card folded into the
index (Bastani and colleagues 2025), landing inside the exact same
`_intake/research-os-k12-literature/` tree PR #5's batch one already
occupies, area by area, and adding a fifth area, `prerequisite-knowledge-
graphs`, absent from batch one entirely. Batch two's own cards carry the
identical frontmatter shape batch one's cards do, so no slot lexicon,
scalar grammar, or classifier needed a change to read one; the
work this pass did was multi-batch *loading and provenance*, not
re-mapping. `load_raw`/`load`'s own `cards_dir` parameter now accepts a
sequence of card roots as well as a single directory: each root is read
in order and tagged `"batch-1"`, `"batch-2"`, ... by its own position;
`hte.evidence.Source` gained a `batches` field naming which root (or
roots, for a DOI two roots both happen to carry) contributed each source,
and a DOI repeated across roots dedupes to its first root's own evidence
rather than double-counting it. `DEFAULT_CARDS_DIRS` names the canonical
"both fixture batches" pair; `load_default()` is the zero-argument
loader `_CORPUS_LOADERS` needs, both fixture batches combined, no
network, deterministic (it does not yet read the real, on-disk 82-card
tree past PR #15: three educational-methods cards a later, separate pass
added with `doi: null` plus an `isbn` field instead of a DOI trip
`_parse_frontmatter`'s own required-DOI check, real follow-up work this
pass does not take on; see `load_default`'s own docstring).

Counts, batch one alone versus both batches combined, over the 6-card and
12-card fixture sets `tests/test_corpus_literature.py` exercises: sources
6 → 12, evidence items 18 → 36 (3 `key_claims` per card, unchanged per
card), ground-truth events 1 → 1 (the chosen batch-two fixture cards add
none of their own), stemma edges 1 → 1 (same reason). A fake campaign
(`HTE_LLM_MODE=fake python3 -m hte.cli campaign run --corpus literature
--seeds 1`) over both batches combined generated 1042 hypotheses, 3
survivors, and chose k-fold holdout (every one of the corpus's own
ground-truth events carries `discovery_year == year`, the same
degenerate case every non-`production` corpus this package ships hits):
1 of 1 held-out event covered (coverage of truth 1.0), Brier score
0.0226.

Registration is done: `hte/cli.py` and `hte/runner.py` each carry
`_CORPUS_LOADERS["literature"] = literature.load_default`, the same
one-line addition `production`'s own registration made, after which a
campaign runs the way a `quantum-history`, `education-atlas`, or
`production` campaign runs:

```bash
cd tools/hypothesis-engine
HTE_LLM_MODE=fake python3 -m hte.cli campaign run --corpus literature --seeds 1
```

`literature.load(cards_dir=None)` (no `cards_dir` at all, `load_default`'s
own path) still fetches over the network by default when called directly,
matching its pre-batch-two contract: it fetches straight from
`bucket-foundation/bucket-foundation` on GitHub and caches under
`$LITERATURE_CARDS_DIR` or the platform temp dir, the same shape
`hte.corpus.production.load_supabase` gives its own Supabase-backed
corpus. Its own default `ref`, PR #5's source branch, 404s once that
branch is gone (it merged mid-review of this exact module; `ref="main"`
is what keeps working after that). `literature.load(cards_dir)` reads a
local checkout instead, no network, one directory or a list of them, the
path every test in `tests/test_corpus_literature.py` takes; `load_
default()` is the only caller that reaches for the fixture batches by
default, since a zero-argument `_CORPUS_LOADERS` entry has no other way
to name which cards it means.
