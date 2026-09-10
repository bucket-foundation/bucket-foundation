# Research OS and the Hypothesis Engine

Bucket Foundation runs two systems that read like separate products and share more machinery than
either document admits on its own. Research OS for K-12 (`_intake/research-os-k12/`, design in
`RESEARCH-OS-K12-SYSTEM-REVIEW.md` and `learning/research-os/PLAN.md`, merged to `main` in PR #3) is
a knowledge-graph learning platform: a student moves through five states per concept node, works
inside a constrained four-tool AI workspace, and can submit a production, a claim with evidence and
sources, for teacher review and payment. `tools/hypothesis-engine/` (merged in PR #2 and PR #4) is a
combinatorial hypothesis-generation engine: it fills concept slots at a time-binned address, fuses
evidence into a subjective-logic opinion, ranks the surviving population in a tournament, and names
the gaps in its own corpus as first-class nodes. Two teams building two things independently arrived
at the same shape twice: a graph of claims, evidence, and provenance, gated by a constrained AI
surface, scored for belief, and priced for payment. This document maps where the shapes touch in
code, and where they only look alike from a distance. `learning/research-os/RESEARCH-QUESTIONS.md`,
also merged in PR #3, already poses 49 numbered questions against this same overlap, nine of them
(19-27, "Engine overlap" and "From the AI-for-science literature") citing named papers this corpus
now carries as full canon-intake files; the twelve questions closing this document extend that list
rather than restate it, and note the number of any question they build on directly.

## Shared Graph Schema

Research OS's graph (`RESEARCH-OS-K12-SYSTEM-REVIEW.md` §3, "Knowledge graph model") is a persistent
Postgres schema: `graph.node` carries a `kind` (fact, concept, law, derivation, primary_source,
artifact), a `tier` (atom, draft, candidate, canon), a `subject`, and a `grade_band`; `graph.edge`
carries a `kind` (prerequisite, derives_from, cites, generalizes, example_of, contradicts); `graph.
prereq_ancestor` precomputes the backward closure routing reads. It is a curated DAG meant to stay
correct and browsable for years.

The engine's graph (`tools/hypothesis-engine/hte/concepts.py`, `hte/hypothesis.py`) is not a persistent
DAG at all. `Slot` is a seven-value enum (`ACTOR`, `ACTION`, `OBJECT`, `PLACE`, `TIME`, `MECHANISM`,
`RELATION`); a `Concept` is one slot value with a prior in log-odds and a `ConsensusStatus`
(`consensus`, `contested`, `fringe`, `other`); a `Placement` fills five slots plus a time bin into one
integer address, and a `Sequence` pairs two placements under an Allen relation. The graph a run
produces is the surviving population of addresses after generation, belief fusion, and tournament
ranking, an evidence-scored slice through a combinatorial space that a fresh run can reshape entirely.

Both graphs carry provenance as a first-class citizen. `graph.edge.provenance` is a `jsonb` column on
Research OS's side; `hte.evidence.Source.stemma_parents` (`hte/evidence.py`) is the engine's own
dependence chain, one production's citation of another walked one hop at a time by `hte.corpus.
production._build_corpus`. Both also carry a maturity ladder gating what counts as settled: Research
OS's `tier` (atom through canon) and the engine's own `GroundTruthEvent`, which only fires for an
`accepted` production (`docs/PRODUCTION-SCHEMA.md`, "Ground truth"). The one edge kind built to join
the two node populations, `generalizes` and `example_of` on the Research OS side, has no counterpart in
the engine's address space; the engine has no analog of "this atom is an instance of that law." The
closest thing it carries is `Concept.definition_url`, an optional pointer from one slot value to a
citable definition, the same kind of upward link aimed at a different corpus.

## Shared Production Envelope

`PLAN.md` §5 gives a production a YAML shape:
`id`, `atom_ids`, `claim`, `stance` (`supports`/`refutes`/`extends`), `evidence_spans`, `slots`,
`checks`, `learner_state_at_submission`, `review`, `registration`, `payout`. `docs/PRODUCTION-SCHEMA.md`
restructures that shape into the JSON `hte.corpus.production` reads: one production holding
many claims instead of one claim per record, the same field names and stance vocabulary kept, four
fields dropped because nothing in the engine's belief fusion reads them (`atom_ids`, `checks`,
`learner_state_at_submission`, `registration`/`payout`). `stance` maps two ways onto the engine's own
`hte.evidence.Stance`: `supports` and `extends` both read as `POSITIVE`, `refutes` reads as `NEGATIVE`.
A claim's five slots (`actor`, `action`, `object`, `place`, `mechanism`) map onto four of the engine's
seven `Slot` values plus `MECHANISM`, skipping `TIME` (carried instead on the claim's own `interval`)
and `RELATION` (no sequence-hypothesis analog on the production side).

The engine's own generation output is a different envelope, built to be ranked rather than authored. A
`Hypothesis` (`hte/hypothesis.py`) is an address plus a `prior_logit`; belief fusion (`hte/belief.py`)
turns evidence into an `Opinion`, a four-tuple `(belief, disbelief, uncertainty, base_rate)` projected
to `P(h) = b + a*u`; the tournament ranks the surviving population by Elo. Nothing in that loop takes a
sentence a person wrote and checks it against cited sources the way `PLAN.md`'s `checks` block does.
The production envelope is a human-authored, teacher-reviewed claim; the engine's own hypothesis is a
machine-generated, evidence-scored placement. `docs/PRODUCTION-SCHEMA.md`'s closing section, "The
write-side hook," names the one place these merge: a `hypothesize_result` written back onto an accepted
production's own record, carrying `posterior_before`/`posterior_after`, `tier_assigned`,
`detectability`, and whether the production moved the hypothesis's rank. That write path is named, not
built; `hte.corpus.production.load_supabase` only reads a production row today.

## Shared Citation and Payment Rail

`PROTOCOL.md` §4.1 defines the sidecar every Bucket artifact carries: `doi`, `source.url`, `cite.
price_usd`, `cite.payout_wallet`, and a `canon_tier` of `draft`/`candidate`/`canon`. Research OS's
production schema reuses this shape directly, one `evidence_spans` entry per citation, each with a
`canonical_url` and a `license`. `PROTOCOL.md` §3.1's agent-trust rule, no payment challenge ever
reaches a caller, settlement runs server-side only, `cite.reader_owes` stays `0`, governs every
learner-facing and agent-facing endpoint Research OS builds, the same rule `RESEARCH-OS-K12-SYSTEM-
REVIEW.md` §3 cites when it forbids the student canvas from ever asking a child to sign anything.

The engine has no dedicated citation field at all. `hte.evidence.EvidenceItem` carries no DOI or URL
column; `docs/PRODUCTION-SCHEMA.md`'s "Where citations live" section folds a claim's `citations` list
(`{type: doi | url | feed402_envelope, value}`) into `EvidenceSpan.locator`, a human-readable string,
because no better field exists yet and the raw `Citation` objects stay intact on the unfiltered
`Production` object `load_raw()` returns. The engine never settles a payment and never touches a
wallet; `docs/RESEARCH-OS-INTEGRATION.md`'s "What the engine does not touch" section names x402,
Dynamic, the CDP facilitator, and Stripe as entirely outside its module map. The shared rail stops at the
envelope shape and the DOI-as-identifier convention. Research OS pays authors over x402 through the
operator wallet PROTOCOL.md §3.1 describes; the engine only ever reads a citation string a production
already carried, and settles nothing itself.

## Shared Constrained AI Tool Surface

Research OS's workspace exposes four tools (`RESEARCH-OS-K12-SYSTEM-REVIEW.md` §3): Locate and Quote
run with no model call, retrieval only; Check runs Sonnet-tier and verifies a claim against cited
evidence; Organize runs Haiku-tier and restructures notes into the claim-evidence-sources shape. None
of the four may write the student's answer or solve the problem.

The engine's loop (`hte/roles.py`) runs generation, `generate`
proposes hypothesis addresses, `critic` and `judge` score a tournament pairing, `extract` pulls
evidence spans from source text with the span re-anchored against the document rather than trusted from
the model's own character offsets, `self_report` writes the run's own calibration and target-blind
check. `PLAN.md` §5's own "Overlap map from the HCI review" names the actual seam: evidence extraction
and claim linking are shared machinery serving two graphs; the critic role on the student side is
narrowed to "does this quote support this claim," with disagreement routed to a teacher rather than
resolved by the model (Holstein and Aleven 2022); the generator role never appears in the student
workspace at all. `docs/K12-INTEGRATION.md` names the same narrowing from the engine's own side:
question 9 in its question map reads `hte.roles.extract`'s span-anchoring discipline, never trusting a
model's own offsets, dropping an unlocatable quote rather than fabricating its span, as the pattern
worth carrying into Research OS's own Quote tool, without the two tools sharing code today.

## Where a Student Production Feeds the Engine

The read side is built. `tools/hypothesis-engine/hte/corpus/production.py` (551 lines) turns a
directory of production JSON files, or a live Supabase `productions` table, into an `hte.corpus.
Corpus`: one `Source` per production, one `EvidenceItem` per claim's evidence entry, one `GroundTruthEvent`
per claim whose production reached `accepted` status with a non-null interval. Twelve fixture
productions ship under `hte/data/production-fixtures/`, three grade bands, two districts, one citation
chain two productions deep, one retraction. What is missing is registration: `hte/cli.py:18` and `hte/
runner.py:91` each keep a fixed `_CORPUS_LOADERS` dict mapping a `--corpus` name to a loader function;
`"education-atlas"` is registered in both, `"production"` is not, a one-line addition
(`_CORPUS_LOADERS["production"] = production.load`) `docs/RESEARCH-OS-INTEGRATION.md` names as the
open item. Once registered, `python3 -m hte.cli campaign run --corpus production --seeds 3` runs
question 19 of Research OS's own 49-question agenda: does a reviewed production's tier and
detectability move the engine's ranked hypotheses in a calibrated direction.

## Where an Engine Hypothesis Becomes a Student Target

The read direction runs the other way through `docs/K12-INTEGRATION.md`'s `hypothesize` MCP tool, a
request naming a corpus and a query, a response carrying a ranked timeline (`hte.export.write_views`'s
`timeline.json`) and a `gap_nodes` list. `mcp-server/bucket-mcp.py:246` already exposes `canon_search`,
`bucket_research`, and `bucket_cite`; `docs/K12-INTEGRATION.md` places `hypothesize` beside them without
touching that file, naming the seam rather than cutting it. `PLAN.md` §5's own upstream direction: "the
engine's ranked hypotheses and its gap-node queue... are frontier targets for routing; a class can be
assigned a gap node." A `GapNode` (`hte/unknowns.py:273`) names an unread source, an unfilled data cell,
or an unresolved mechanism; `value_of_information` (`hte/unknowns.py:289`) and `active_priority`
(`hte/unknowns.py:323`) already score which gap is worth closing next. Neither function is called from
`hte.runner` today, the same gap `docs/RESEARCH-OS-INTEGRATION.md`'s question 20 names for every
corpus this package ships: the queue exists, tested on its own, wired into no campaign. A student's
frontier-backward route resolving against a live gap node, rather than a static graph target, waits on
one engine-side wiring bead in `hte.runner`.

## Integration Points

| File | What lives there | Status |
|---|---|---|
| `tools/hypothesis-engine/hte/corpus/production.py` | Reads a production JSON directory or a live Supabase table into an `hte.corpus.Corpus` | Built, not registered |
| `tools/hypothesis-engine/hte/data/production-fixtures/` | Twelve fixture productions across three grade bands and two districts | Built |
| `tools/hypothesis-engine/docs/PRODUCTION-SCHEMA.md` | The production JSON schema and its field-by-field mapping onto `hte.evidence` | Written |
| `tools/hypothesis-engine/docs/RESEARCH-OS-INTEGRATION.md` | The 49-question map, the `hypothesize` tool contract, the milestones table, the write-side hook | Written |
| `tools/hypothesis-engine/docs/K12-INTEGRATION.md` | The `education-atlas` corpus adapter and the `hypothesize` request and response shape | Built and written |
| `tools/hypothesis-engine/hte/runner.py:91`, `hte/cli.py:18` | `_CORPUS_LOADERS`, where a `--corpus production` registration would land | Open, one line |
| `tools/hypothesis-engine/hte/unknowns.py:273` | `GapNode` | Built, not wired into `hte.runner` |
| `tools/hypothesis-engine/hte/unknowns.py:289`, `:323` | `value_of_information`, `active_priority` | Built, not wired into `hte.runner` |
| `tools/hypothesis-engine/hte/belief.py:69`, `:106`, `:391` | `Opinion`, `fuse`, `score`, the belief-fusion math a `hypothesize` result would expose to a teacher view | Built |
| `tools/hypothesis-engine/hte/roles.py` | `extract`'s span-anchoring discipline, the pattern named for Research OS's own Quote tool | Built, pattern not ported |
| `mcp-server/bucket-mcp.py:246` | `TOOLS`, where a future `hypothesize` entry sits beside `canon_search`/`bucket_research`/`bucket_cite` | Named, not added |
| `PROTOCOL.md` §3.1, §4.1 | The agent-trust rule and the sidecar schema both systems' citation envelopes share | Written, both consume |
| `learning/research-os/PLAN.md` §5 | The production schema's source of truth and the HCI-review overlap map this document reads from | Written, merged |
| `learning/research-os/RESEARCH-QUESTIONS.md` | 49 numbered open questions, nine of them (19-27) already citing AI-for-science papers this corpus now carries as full files | Written, merged |
| `_intake/research-os-k12/RESEARCH-OS-K12-SYSTEM-REVIEW.md` §3 | Research OS's own graph schema, learner states, and four-tool workspace design | Written, merged |

## Twelve Open Research Questions the Combined System Can Study

Each item names the paper or papers that pose it and, where one exists, the numbered question in
`learning/research-os/RESEARCH-QUESTIONS.md` it extends rather than restates.

1. **Does scoped-tool AI support avoid the cognitive-offloading harm a full chatbot risks.** Bainbridge
   (1983) names the mechanism, an operator who stops practicing the skill a system automates loses it;
   Sparrow, Liu, and Wegner (2011) show the same pattern for memory and search. Research OS's own
   three-arm testbed (constrained AI, full chatbot, no-AI control) is built to answer this directly.
   Extends `RESEARCH-QUESTIONS.md` Q8 and Q11.
2. **Does a scoped find/quote/check/organize interface replicate a two-sigma-class tutoring effect at
   graph-routed scale.** Bloom (1984) sets the target effect size; VanLehn (2011) and Kulik and
   Fletcher (2016) measure how far intelligent tutoring systems close that gap without a human tutor.
   Extends `RESEARCH-QUESTIONS.md` Q8.
3. **Does frontier-backward routing beat forward sequencing on retention and transfer.** Barnett and
   Ceci (2002) frame what counts as a transfer claim worth testing; `PLAN.md` §1 lists routing itself
   as a hypothesis awaiting the test its own section 7 describes. Extends `RESEARCH-QUESTIONS.md` Q5
   and Q29.
4. **Do AI-generated hypotheses meet the novelty and testability bar a domain scientist applies, and
   does a reviewed K-12 production meet the same bar.** The AI-for-science literature on evaluating
   generated hypotheses (Si, Yang, and Hashimoto 2024; Lu and others 2024), read alongside Auchincloss
   and others (2014) on the missing-instrument and reporting-quality problem `PLAN.md` §5 already cites
   as a constraint on the production record. Extends `RESEARCH-QUESTIONS.md` Q21.
5. **Does a citation-payment incentive change the quality of self-explanation and productive struggle,
   or crowd it out.** Deci and Ryan (2000) on self-determination theory and Kapur (2008) on productive
   failure both predict a payment framed the wrong way could shift a student from mastery to
   performance goals. Extends `RESEARCH-QUESTIONS.md` Q13 and Q30.
6. **Does isolated-quote checking or full-document-context checking change a critic tool's accuracy.**
   `docs/RESEARCH-OS-INTEGRATION.md` question 22 names this directly as a Research OS question the
   engine's own held-out corpus can answer cheaply, no production required, before the same comparison
   runs on production data. Is `RESEARCH-QUESTIONS.md` Q22 itself.
7. **Can literature-based discovery over a slot-filled hypothesis space close named gap nodes.**
   Swanson's ABC-model papers on undiscovered public knowledge are the founding case for treating an
   unmade connection as itself a discoverable object, exactly what `hte.unknowns.GapNode` formalizes.
   Extends `RESEARCH-QUESTIONS.md` Q20.
8. **Does named human sign-off change how a downstream system should weight a claim's detectability and
   tier.** Holstein and Aleven (2022) on human-AI complementarity in classrooms and Birhane and others
   (2023) on human oversight of AI-assisted science both bear on how `docs/PRODUCTION-SCHEMA.md`'s
   review ladder should set the tier a production enters belief fusion at. Extends `RESEARCH-QUESTIONS.
   md` Q19 and Q24.
9. **Does spaced retrieval practice interact differently with a machine-graded checkpoint than a
   human-graded one.** Roediger and Karpicke (2006) establish the testing effect; Corbett and Anderson
   (1994) and Piech and others (2015) are the two knowledge-tracing models Research OS's own FSRS-plus-
   IRT/Elo fusion sits between. Extends `RESEARCH-QUESTIONS.md` Q2 and Q33.
10. **What division of cognitive labor between a student-researcher and the AI holds across the five
    learner states, and does it shift with age.** The AI-for-science literature on human-AI division of
    labor in research (Wang and others 2023; Messeri and Crockett 2024), read against `PLAN.md` §5's
    own claim that the generator role never belongs in a student workspace at any age. Not yet posed in
    `RESEARCH-QUESTIONS.md`; the closest neighbor is Q26 on which frontier nodes attract routing.
11. **Does the burden of knowledge predict where an engine's gap nodes cluster, and does routing
    students at those gaps produce citable productions.** Jones's work on the burden of knowledge and
    the shrinking of an individual researcher's reachable frontier motivates reading `hte.unknowns.
    GapNode` clustering as a measurable, generational signal rather than a per-run artifact. Extends
    `RESEARCH-QUESTIONS.md` Q20 and Q26.
12. **Is scientific understanding, as distinct from predictive accuracy, achievable by an AI system, and
    what would count as evidence a K-12 production reached it.** Krenn and others (2022) and de Regt's
    work on scientific understanding both bear directly on whether Production, the highest of Research
    OS's five states, should be graded on correctness alone or on a harder, understanding-specific bar.
    Not yet posed in `RESEARCH-QUESTIONS.md`; a candidate Q50.
