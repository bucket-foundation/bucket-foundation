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

Classification key: **runnable** (the engine can run this today, or with the
one open-line corpus registration `K12-INTEGRATION.md` already names),
**needs adapter** (the engine could answer this once a new corpus or
evidence source exists), **out of scope** (an individual-learner,
classroom, or product question no slot-filled address space and belief
score answers; it needs a knowledge-tracing model, an RCT, or a survey
instead).

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
| 19 | Detectability and tier for a reviewed production; do productions move rankings in a calibrated direction | needs adapter | The campaign itself is `hte.calibrate.run_holdout` with and without production evidence, which the engine already runs for its two shipped corpora. What is missing is the production record as an ingestible source. See Data services below: the closest `03-data-services.md` line is Supabase (section J), since a production lives as Research OS's own row rather than a vendor corpus. | Once ingested: ACTOR = the production's `slots.actor` or `OTHER`; ACTION = `slots.action` or `OTHER`; OBJECT = the atom's own concept; PLACE = `slots.place` or `OTHER`; MECHANISM = `slots.mechanism` or `OTHER`; TIME = the atom's own period; the submission date plays no role. |
| 20 | Gap-node queue as a curriculum | blocked on engine wiring | `hte.unknowns.GapNode`, `value_of_information`, and `active_priority` exist and are tested on their own; nothing in `hte.runner` calls them yet, the same gap the README names for every corpus this package ships. This is a `bkt-hte-` bead (already named in `PLAN.md` section 10's own list); once wired, it runs against `education_atlas` or `quantum_history` alike, with no corpus adapter required. |
| 21 | Artifact-validity instrument predicts fusion weight | needs adapter | Same production dependency as question 19. |
| 22 | Isolated-quote versus full-document-context checking on productions | needs adapter | Needs productions to run as stated. A generic version (the same comparison over `quantum_history`'s own evidence spans, no production required) is runnable today and would be the cheaper first pass. |
| 23 | Cross-family versus same-family judge on held-out placements | blocked on engine wiring | `hte.llm.complete` shells out to the `claude` CLI only; `hte/data/model-policy.json` picks a model per role but every choice is a Claude tier (sonnet, haiku, opus), never a second provider. A same-family comparison (sonnet judge versus opus judge) is a one-line policy edit and runnable today against `quantum_history`'s own held-out placements; the cross-family half PLAN.md section 10 asks for needs `hte.llm` extended to call a non-Anthropic model first. No single-hypothesis slot frame applies either way; the unit of comparison is the whole held-out population's calibration across every placement. |
| 24 | Re-scoring cadence and reviewer training versus the fusion rule | needs adapter | "Reviewer training" and "reviewer calibration feedback" both presuppose the production schema's `review.teacher` and `review.bucket_reviewer` roles. |
| 25 | Reliability-weighted student slot extraction, a Galaxy Zoo pattern | needs adapter | A production's own `slots` block already carries the same five fields the engine fills; this asks whether many students' filled slots on the same evidence, weighted by track record, converge on the engine's own extraction. Needs many productions against shared evidence, not yet in hand. |
| 26 | Which frontier nodes attract routing, and does the generator track that traffic | needs adapter | Needs Research OS's own routing-event log as a second time series beside the engine's regular corpus. No `03-data-services.md` row names this; it is Research OS's own product telemetry, closest infra line again Supabase. |
| 27 | Locking evaluation criteria before check runs, a Registered Reports pattern | needs adapter | Named as a property of "a production's evaluation criteria" in the question text; needs the production pipeline to exist before it is testable as stated. |

### From the AI-for-science literature

Questions 21, 22 (as stated), 24, 25, and 27 above are drawn from this
literature review; the table above already carries them. Every one of its
questions needs either a production or an existing corpus's held-out
population, and each data need is covered above.

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

Runnable today: 0. Blocked on an engine-wiring bead rather than a corpus: 2
(questions 20 and 23, the latter runnable in a same-family form today and
blocked only on its cross-family half). Needs a new adapter, in every case
the production record: 7 (questions 19, 21, 22, 24, 25, 26, 27). Out of
scope for hypothesis generation: 40.

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

| `PLAN.md` milestone | Engine artifact | How |
|---|---|---|
| Phase 0 exit test: "a learner can route backward from one engine hypothesis... and submit a production the engine ingests" | Timeline of hypotheses with opinions; gap nodes | The router's `target` resolves against the ranked timeline or a gap node; the corpus behind Phase 0's find tool is `quantum/07-history`, the same corpus the engine already ingests. |
| `ros-03`, route API with a target parameter | Timeline of hypotheses with opinions; gap nodes | Same resolution path as the Phase 0 exit test; this is the work item that builds it. |
| `ros-04`, four-tool workspace over the Phase 0 corpus | Timeline of hypotheses with opinions | `find`'s retrieval surface over the Phase 0 subject is the engine's own evidence base for that corpus. |
| `ros-05`, production schema and engine adapter | None yet; this is the item that lets a future run consume self-report and calibration output on the production side | This is the write path itself, section 5's schema mapped onto `hte.evidence.EvidenceItem` by field. |
| `ros-08`, evidence infrastructure and pre-registration | Self-report | The engine's own calibration summary and target-blind check are the nearest existing precedent for the pre-registration record Research OS's own study needs to publish; `PLAN.md` does not wire this today. |
| `ros-11`, hypothesis-engine changes from the AI-for-science review | None; the flow runs the other direction here | Research OS's literature review hands bead candidates to the engine; listed for completeness. |

An emitted paper (`papers/history-hypothesis-engine/main.tex`, tracked by
its own bead) feeds no `PLAN.md` milestone directly today. The nearest link
is section 10's own ask for calibration "on a fixed published cadence,
CASP-style": a published calibration record is exactly what would let
Phase 1's pre-registered study and Phase 2's Common Sense and Digital
Promise reviews cite the engine's own track record instead of the raw
tournament output. `PLAN.md` does not name that citation path yet.

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
(`_intake/research-os-k12-literature/`, 45 DOI-verified papers, now merged
to `main`) into a fourth `Corpus`, next to `quantum_history`,
`education_atlas`, and `production`. One `Source` per card, keyed by its
own DOI; `EvidenceItem`s from each card's `key_claims` bullets, a real
span pointing at the checked-in file's own line range and quote; a
`GroundTruthEvent` when a card is a meta-analysis or reports a replication
directly; a stemma edge when a card cites another card in the same corpus
by its own first author. The full mapping lives in `hte/corpus/
literature.py`'s own top docstring.

This closes a gap the question map above names twice, without moving
either question's own class: question 22, "isolated-quote versus
full-document-context checking on productions," already runs a generic,
no-production version "over `quantum_history`'s own evidence spans"; that
generic run now has a second, closer-fitting corpus, since `quantum_
history`'s own spans are chapter prose about ancient history and
`literature`'s own spans are the real, DOI-verified academic quotes the
question is asking about. Question 23, "cross-family versus same-family
judge on held-out placements," gains the same second option, gated on the
same engine-side blocker `hte.llm.complete`'s Claude-only model policy
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

Registration is not done in this pass, new files only per this work's own
brief: `_CORPUS_LOADERS` in `hte/cli.py:18` and `hte/runner.py:91` would
each need one added line,

```python
_CORPUS_LOADERS["literature"] = literature.load
```

the same one-line addition `production`'s own registration made, after
which a campaign runs the way a `quantum-history`, `education-atlas`, or
`production` campaign runs:

```bash
cd tools/hypothesis-engine
python3 -m hte.cli campaign run --corpus literature --seeds 3
```

`literature.load()` takes no local corpus by default: it fetches the 45
cards straight from `bucket-foundation/bucket-foundation` on GitHub and
caches them under `$LITERATURE_CARDS_DIR` or the platform temp dir, the
same shape `hte.corpus.production.load_supabase` gives its own
Supabase-backed corpus. Its own default `ref`, PR #5's source branch, 404s
once that branch is gone (it merged mid-review of this exact module;
`ref="main"` is what keeps working after that). `literature.load(cards_
dir)` reads a local checkout instead, no network, the path every test in
`tests/test_corpus_literature.py` takes.
