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

   *Evidence added in batch two, supports the design bet:* Risko and Gilbert (2016) supply the general
   offloading framework the testbed's three arms are built to separate; Ward (2021) and Fisher, Goddu,
   and Keil (2015) each predict a friction-dependent misattribution effect the scoped workspace's
   required steps should reduce relative to a full chatbot; Bastani and colleagues (2025) and Kosmyna
   and colleagues (2025) supply causal (exam performance) and physiological (EEG connectivity) evidence
   for the same guardrail-versus-unrestricted split; Macnamara and colleagues (2024) argue any post-test
   must be unassisted and scheduled after a retention interval, since learners do not notice their own
   skill decay. *Complicates:* Doshi and Hauser (2024) add a class-level cost, reduced diversity across
   many learners' productions, invisible to any per-student outcome the testbed currently measures.

   *Evidence added in batch three, supports and complicates the design bet:* Dell'Acqua and colleagues
   (2023) give the sharpest empirical case for scoping over an open-ended tutor: the same AI assistance
   that helps inside its own capability frontier can perform below a no-AI baseline outside it, and the
   frontier is invisible to a user without an explicit signal. Bucinca, Malaya, and Gajos (2021) name the
   mechanism behind Locate and Quote's own evidence-before-Check ordering, a cognitive forcing function
   that reduces over-reliance on a wrong AI answer past explanation alone, with a retention benefit that
   outlasts the assisted session. *Complicates:* Bansal and colleagues (2021) find complementary
   human-AI performance was rare even when explanations raised stated trust, and Vaccaro, Almaatouq, and
   Malone (2024)'s meta-analysis finds human-AI combination underperforms the better of either alone on
   content-creation tasks on average, a caution that scoping the tool surface does not by itself
   guarantee the complementary gain the testbed is built to measure.

   *Evidence added in batch four, complicates the design bet:* Kirschner, Sweller, and Clark (2006)
   read as minimally guided instruction with an AI-shaped veneer, the four-tool workspace risks the
   effectiveness penalty that paper documents for learners without high prior knowledge, exactly the
   learners a research-skill-building tool should serve best. *Resolves, conditionally:* Hmelo-Silver,
   Duncan, and Chinn (2007)'s direct reply argues problem-based and inquiry learning are extensively
   scaffolded rather than minimally guided, a description structurally closer to the four-tool
   constraint's own no-tool-writes-the-answer design than to unguided discovery learning, conditional
   on checking that paper's own scaffolding criteria against each tool rather than assuming they
   transfer by category resemblance. *Complicates further:* Wineburg and McGrew (2019) find the expert
   strategy for evaluating a source is lateral reading, leaving the page to cross-reference elsewhere,
   a strategy no single-source, in-page Check verdict currently performs, and Breakstone and colleagues
   (2021)'s national finding that most high school students fail exactly this task unassisted sets the
   empirical floor the workspace's own offloading-avoidance claim is designed against.
2. **Does a scoped find/quote/check/organize interface replicate a two-sigma-class tutoring effect at
   graph-routed scale.** Bloom (1984) sets the target effect size; VanLehn (2011) and Kulik and
   Fletcher (2016) measure how far intelligent tutoring systems close that gap without a human tutor.
   Extends `RESEARCH-QUESTIONS.md` Q8.

   *Evidence added in batch two, supports the design bet:* Slijepcevic and Yaylali (2025) find a
   deployed, Socratic-style AI tutor (Khanmigo) outperforming unassisted search on physics learning
   outcomes, a real-world data point for scoped-tool tutoring beating no-AI, though the study lacks the
   testbed's own full-chatbot comparison arm.
3. **Does frontier-backward routing beat forward sequencing on retention and transfer.** Barnett and
   Ceci (2002) frame what counts as a transfer claim worth testing; `PLAN.md` §1 lists routing itself
   as a hypothesis awaiting the test its own section 7 describes. Extends `RESEARCH-QUESTIONS.md` Q5
   and Q29.

   *Evidence added in batch two, supports the design bet:* Pan and colleagues (2017), Liang and
   colleagues (2018), Roy and colleagues (2019), and Gasparetti and colleagues (2017) are direct
   precedent for the two operations frontier-backward routing needs, inferring a prerequisite edge and
   walking it backward to build a route, and Gligorea and colleagues (2023)'s review places the
   approach inside a wider adaptive-learning field rather than a design without precedent. *Complicates:*
   Gasparetti and colleagues (2017) find instructor disagreement concentrates on weak or optional
   prerequisite pairs, a warning that not every learned edge should enter `graph.prereq_ancestor` at
   `canon` tier.

   *Evidence added in batch three, supports the design bet:* De Medio and colleagues (2016) and
   Manrique and colleagues (2018) are two more independent teams converging on the same
   candidate-then-confidence method family, and Zhou and Xiao (2019) independently corroborate
   Wikipedia's own link structure as a prerequisite signal, alongside Roy and colleagues (2019)'s
   related finding. Valdez, Roldan, and Masuli (2025) extend the technique itself: centrality analysis
   over a real prerequisite network could identify which frontier nodes serve the most downstream
   targets once mastered, a criterion orthogonal to the router's edge-confidence weighting. *Complicates:*
   Alzetta and colleagues (2018)'s gold-standard dataset finds only moderate inter-annotator agreement
   among trained humans labeling prerequisite pairs, and Novak (1990) sets a validity bar for any
   claimed concept structure, expert review against a domain's accepted structure, that a
   lexical-overlap `inferred` edge does not clear by construction.
4. **Do AI-generated hypotheses meet the novelty and testability bar a domain scientist applies, and
   does a reviewed K-12 production meet the same bar.** The AI-for-science literature on evaluating
   generated hypotheses (Si, Yang, and Hashimoto 2024; Lu and others 2024), read alongside Auchincloss
   and others (2014) on the missing-instrument and reporting-quality problem `PLAN.md` §5 already cites
   as a constraint on the production record. Extends `RESEARCH-QUESTIONS.md` Q21.

   *Evidence added in batch two, supports the design bet:* Gottweis and colleagues (2026)'s wet-lab
   validation arm and Yamada and colleagues (2025)'s workshop-acceptance result each raise the bar for
   what counts as a passed check, human peer review rather than an automated pass or fail; Zhou and
   colleagues (2024, HypoGeniC), Kumar and colleagues (2024), and Schmidgall and colleagues (2025) supply
   cheaper, classroom-scale evaluation methods (a downstream classifier's accuracy, overlap with an
   expert's own model answer, staged human feedback) closer to what a single class's production data can
   support than a wet-lab or workshop-review step. Ghafarollahi and Buehler (2024, SciAgents) and
   Mitchener and colleagues (2025, Kosmos) bear on the engine's own generation and traceability design
   rather than directly on the K-12 novelty bar.

   *Evidence added in batch four, supports and complicates the design bet:* Corwin, Graham, and Dolan
   (2015) supply a pathway-model discipline, connecting a specific learner action to a specific claimed
   outcome, testable and revisable, the same discipline the K-12 novelty bar needs before it can be
   applied to a Production record rather than only asserted. *Complicates:* Sadler and colleagues
   (2010)'s 53-study review finds research-apprenticeship participation produces some outcomes
   (career aspirations, confidence) with more consistency than others (nature-of-science understanding)
   without design attention, and duration matters, a caution against assuming workspace use alone,
   independent of Production frequency, produces a novelty-bar-clearing result. Burgin, Sadler, and
   Koroly (2012) further complicate by finding apprenticeship features predict outcomes more than
   participation alone does, an argument against treating "used the workspace" as a uniform treatment
   at the arm level.
5. **Does a citation-payment incentive change the quality of self-explanation and productive struggle,
   or crowd it out.** Deci and Ryan (2000) on self-determination theory and Kapur (2008) on productive
   failure both predict a payment framed the wrong way could shift a student from mastery to
   performance goals. Extends `RESEARCH-QUESTIONS.md` Q13 and Q30.

   *Evidence added in batch two, supports the design bet:* Deci, Koestner, and Ryan (1999)'s 128-study
   meta-analysis names the exact reward category, tangible, expected, performance-contingent, a
   citation-on-acceptance payment falls into; Fryer (2011) points the payout toward the process the
   four-tool workspace already logs rather than the final grade. *Complicates:* Gneezy and Rustichini
   (2000) warn a small payment can underperform no payment at all, a non-monotonic risk the payout pilot
   must clear rather than assume away; Mekler and colleagues (2017) partially contradict the simple
   crowd-out story by finding a non-payment, recognition-style element raised performance with no
   measured motivational cost, supporting `RESEARCH-QUESTIONS.md` Q13's recognition-only arm as a real
   design option rather than a fallback.

   *Evidence added in batch three, supports the design bet:* Chi and colleagues (1989) supply the
   decades-old scoring scheme this question's own productive-struggle framing rests on, counting the
   inferences a learner generates while studying rather than a final answer's surface correctness; Renkl
   (2002) sharpens what the payout should reward, a brief rationale-focused hint raised self-explanation
   frequency while a hint restating a step's own content added no benefit, evidence a payout tied to
   process signals like these would reward the mechanism rather than a shortcut around it.

   *Evidence added in batch four, complicates the design bet:* Grinnell and colleagues (2020) supply
   the sharpest complicating data point in this corpus: among students required to participate in
   science fair who were not interested in a science career, about 10 percent reported research
   misconduct such as plagiarism, a documented failure mode neither Deci-Koestner-Ryan (1999) nor
   Gneezy-Rustichini (2000) name directly in their own motivational-crowd-out terms. Grinnell and
   colleagues (2018) further find little student support for requiring a competitive research
   deliverable, an argument for keeping Production non-competitive. *Sharpens the payout
   target:* Bangert-Drowns, Hurley, and Wilkinson (2004) find metacognitive prompting predicts a
   stronger writing-to-learn effect while longer individual writing assignments predict a weaker one,
   and Berland and Reiser (2009) name a third goal, persuading, that students pursue as a rule
   less often than sensemaking and articulating, a goal the current Production rubric does not score for.
6. **Does isolated-quote checking or full-document-context checking change a critic tool's accuracy.**
   `docs/RESEARCH-OS-INTEGRATION.md` question 22 names this directly as a Research OS question the
   engine's own held-out corpus can answer cheaply, no production required, before the same comparison
   runs on production data. Is `RESEARCH-QUESTIONS.md` Q22 itself.

   *Evidence added in batch two:* no batch-two paper tests this question directly. Binz and Schulz
   (2023)'s finding that GPT-3's reasoning accuracy swings sharply with small phrasing changes is
   tangential support for treating any single-pass model check as fragile, worth the isolated-versus-
   full-context comparison this question already proposes running before trusting Check at either
   setting.

   *Evidence added in batch four, complicates the design bet:* Wineburg and McGrew (2019) find the
   expert strategy for evaluating a source is lateral reading, leaving the page under evaluation to
   check what other sources say about it, rather than reading deeper within the one source already
   located; a single-source, in-page Check verdict is closer to the vertical reading their study finds
   less skilled evaluators default to than to the expert strategy. Breakstone and colleagues (2021)'s
   national portrait sharpens the stakes: 96 percent of a nationally representative sample of high
   school students missed an advocacy site's own industry ties, evidence that isolated-quote checking
   without a provenance-check step risks automating the same surface-cue trust most students already
   default to rather than correcting it. Kuiper, Volman, and Terwel (2005)'s decade-earlier review
   independently arrives at the same two-part need, support for searching and support for information
   literacy, that this question's own isolated-versus-full-context contrast is one operational version
   of.
7. **Can literature-based discovery over a slot-filled hypothesis space close named gap nodes.**
   Swanson's ABC-model papers on undiscovered public knowledge are the founding case for treating an
   unmade connection as itself a discoverable object, exactly what `hte.unknowns.GapNode` formalizes.
   Extends `RESEARCH-QUESTIONS.md` Q20.

   *Evidence added in batch two, supports the design bet:* Ghafarollahi and Buehler (2024, SciAgents)
   sample paths through a literature-derived knowledge graph as seeds for hypothesis proposal, the
   closest published system to a `hypothesize` query walking `graph.node`/`graph.edge` toward an
   engine gap node; Roy and colleagues (2019)'s finding that citation and reference structure predicts
   prerequisite relations suggests `graph.edge`'s own `cites` kind could double as a gap-relevance
   signal.

   *Evidence added in batch three, supports the design bet:* Gottlieb and colleagues (2013)'s review of
   information-seeking as driven by expected information gain gives a published computational account,
   past Swanson's own founding case, for treating an unmade connection as a discoverable object with a
   scoreable value, the same move `hte.unknowns.value_of_information` makes.
8. **Does named human sign-off change how a downstream system should weight a claim's detectability and
   tier.** Holstein and Aleven (2022) on human-AI complementarity in classrooms and Birhane and others
   (2023) on human oversight of AI-assisted science both bear on how `docs/PRODUCTION-SCHEMA.md`'s
   review ladder should set the tier a production enters belief fusion at. Extends `RESEARCH-QUESTIONS.
   md` Q19 and Q24.

   *Evidence added in batch two, supports the design bet:* Macnamara and colleagues (2024)'s finding
   that learners cannot self-assess their own AI-assisted skill decay argues sign-off cannot be
   self-reported and must come from an external reviewer; Schmidgall and colleagues (2025, Agent
   Laboratory) find intermediate-stage human feedback improves output quality more than end-only review,
   supporting teacher review sited at Production rather than only at a finished claim.

   *Evidence added in batch three, supports the design bet:* Molenaar (2022)'s six-level scale of AI
   control over learning gives Research OS's own division of labor, no checkpoint on Check or Organize,
   a mandatory one on Production, a named place in a published typology, and finds a system granted too
   much control can outrun teacher trust even when more accurate, direct support for keeping sign-off
   sited at Production rather than lower. Herodotou and colleagues (2019) supply field evidence that
   training teachers on a predictive model's own mechanism, alongside its output, raises trust and use
   past output-only training, a design implication for the review ladder's own onboarding.
9. **Does spaced retrieval practice interact differently with a machine-graded checkpoint than a
   human-graded one.** Roediger and Karpicke (2006) establish the testing effect; Corbett and Anderson
   (1994) and Piech and others (2015) are the two knowledge-tracing models Research OS's own FSRS-plus-
   IRT/Elo fusion sits between. Extends `RESEARCH-QUESTIONS.md` Q2 and Q33.

   *Evidence added in batch two:* no batch-two paper tests spaced retrieval against a machine-graded
   checkpoint directly. Stadler, Bannert, and Sailer (2024)'s finding that LLM assistance during inquiry
   lowers both effort and depth together is tangential support for suspecting a machine-graded
   checkpoint could mask the same depth loss a human grader would catch, worth carrying into this
   question's own test design.
10. **What division of cognitive labor between a student-researcher and the AI holds across the five
    learner states, and does it shift with age.** The AI-for-science literature on human-AI division of
    labor in research (Wang and others 2023; Messeri and Crockett 2024), read against `PLAN.md` §5's
    own claim that the generator role never belongs in a student workspace at any age. Not yet posed in
    `RESEARCH-QUESTIONS.md`; the closest neighbor is Q26 on which frontier nodes attract routing.

    *Evidence added in batch two, supports the design bet:* Schmidgall and colleagues (2025, Agent
    Laboratory) keep a human in the loop at every pipeline stage by design, the same constraint
    Research OS's workspace enforces by construction; Binz and Schulz (2023)'s method, probing a model
    with canonical psychology tasks rather than one benchmark score, is a candidate way to test whether
    the division of labor actually shifts with a learner's own age or state rather than staying fixed.

    *Evidence added in batch three, supports and complicates the design bet:* Shneiderman (2020)'s
    separable control-and-automation axes give a vocabulary for the division already built into the
    workspace, high automation on Locate and Quote, full human control on when a claim counts.
    *Complicates:* Vaccaro, Almaatouq, and Malone (2024)'s meta-analysis finds human-AI combination
    underperforms the better of either alone on content-creation tasks in particular, a caution since
    writing a claim sits closer to content creation than to the decision tasks the same review finds
    combination helps; Noy and Zhang (2023) add a nuance worth separating from Doshi and Hauser (2024)'s
    diversity loss, the same AI assistance that narrows collective diversity across writers also narrows
    the gap between weaker and stronger writers, two distinct class-level effects a division-of-labor
    outcome measure should not collapse into one.

    *Evidence added in batch four, complicates and resolves the design bet:* Furtak and colleagues
    (2012)'s meta-analysis of inquiry-based science teaching finds teacher-led activities outperform
    student-led ones by a mean effect size about 0.40 larger, the empirical stakes behind whether the
    four-tool workspace's own guidance supplies teacher-equivalent scaffolding or falls closer to
    unguided student-led inquiry. Kirschner, Sweller, and Clark (2006) sharpen the complication directly:
    read as minimally guided instruction, the workspace risks underperforming for learners with the
    least prior knowledge. *Resolves, conditionally:* Hmelo-Silver, Duncan, and Chinn (2007) reply that
    problem-based and inquiry learning are extensively scaffolded rather than minimally guided, a
    description this corpus's own Sandoval (2005) complicates from a different angle: even scaffolded
    inquiry does not close the gap between a learner's formal epistemological belief and the practical
    epistemology guiding their inquiry, so division-of-labor gains on a Check-verdict outcome measure
    may leave the underlying epistemic stance untouched. Burgin, Sadler, and Koroly (2012) add that
    apprenticeship-style research features predict which outcomes a learner reports more than
    participation alone does, a human-mentorship precedent for the same variation a standardized
    four-tool workspace is designed to reduce.
11. **Does the burden of knowledge predict where an engine's gap nodes cluster, and does routing
    students at those gaps produce citable productions.** Jones's work on the burden of knowledge and
    the shrinking of an individual researcher's reachable frontier motivates reading `hte.unknowns.
    GapNode` clustering as a measurable, generational signal rather than a per-run artifact. Extends
    `RESEARCH-QUESTIONS.md` Q20 and Q26.

    *Evidence added in batch two, supports the design bet:* Kitano (2021)'s discovery spectrum, from
    confirming a known result to formulating a new framework, gives a way to score whether a routed gap
    node produces a merely confirming production or a genuinely gap-closing one, sharpening what
    "citable production" should mean for this question.

    *Evidence added in batch three, supports the design bet:* Oudeyer, Kaplan, and Hafner (2007) supply
    the founding computational account of learning-progress-driven prioritization, reward an action by
    how much it improves a learner's own predictive model, a mechanism that naturally avoids both
    mastered and unlearnable regions, the closest published precedent for what `hte.unknowns.
    active_priority`'s own unwired scoring function is likely to need. Valdez, Roldan, and Masuli (2025)
    add a structural technique, centrality analysis, for identifying which nodes in a curriculum's own
    prerequisite network sit at generational choke points worth clustering gap nodes around.
12. **Is scientific understanding, as distinct from predictive accuracy, achievable by an AI system, and
    what would count as evidence a K-12 production reached it.** Krenn and others (2022) and de Regt's
    work on scientific understanding both bear directly on whether Production, the highest of Research
    OS's five states, should be graded on correctness alone or on a harder, understanding-specific bar.
    Not yet posed in `RESEARCH-QUESTIONS.md`; a candidate Q50.

    *Evidence added in batch two, supports and complicates the design bet:* Messeri and Crockett
    (2024) name the illusion of explanatory depth directly, a learner who cannot reconstruct their own
    claim without the AI has this illusion whatever grade a surface-correctness check assigns, arguing
    Production needs a harder bar than passing Check; Kitano (2021)'s graded discovery spectrum offers
    that harder bar as a non-binary scale rather than a single pass or fail; Binz and Schulz (2023)
    supply a probing method, testing a system or a production against a battery of tasks rather than one
    score, for telling a surface match from real understanding.

    *Evidence added in batch three, supports the design bet:* Linn (2000)'s knowledge-integration
    framework, scoring how many ideas a learner has connected and how well contradictions between them
    are reconciled, offers a candidate operational form for the harder, understanding-specific bar this
    question names, one that Messeri and Crockett's illusion-of-explanatory-depth finding argues a
    surface-correctness Check verdict alone would not catch.

    *Evidence added in batch four, supports and complicates the design bet:* Kuhn (1999)'s developmental
    model names three forms of meta-knowing, metacognitive, metastrategic, and epistemological, and
    argues the epistemological form, knowing about the nature and sources of knowledge, is closer to
    what a harder, understanding-specific bar should target than factual correctness alone. Chinn,
    Buckland, and Samarapungavan (2011) supply a more granular, five-component candidate operational
    framework, of which the sources-and-justification component maps onto what Check's own citation
    verification already checks while epistemic virtues, aims, and value name dimensions no current tool
    or rubric touches. *Complicates:* Sandoval (2005) argues formal epistemological belief and the
    practical epistemology guiding a learner's own inquiry are distinct and often disconnected,
    so a learner could pass every Check verdict without an underlying epistemic-stance shift; Lederman
    and colleagues (2002)'s VNOS instrument is the validated way to assess nature-of-science
    understanding directly this gap calls for, but its own open-ended-plus-interview design argues
    against folding it into Check's automated, closed-set grading.
