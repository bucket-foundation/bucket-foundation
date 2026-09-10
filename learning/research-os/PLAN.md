# Research OS for K-12: Plan

**Status:** design, iteration 1 · **Date:** 2026-09-09 · **Beads:** filed in `BEADS-PENDING.jsonl` under the `ros-` prefix until the bucket-foundation Nucleus `/issues` route is restored (see `ROADMAP.md`, bkt-roadmap-01).

Research OS for K-12 is the production-reaching path for the L1 rung of the depth ladder (`src/lib/depth-ladder.ts`). Bucket Academy already covers the consume side (Concept Atoms, the prerequisite graph with prerequisite, nucleus, and frontier shells, FSRS review, the Recall, Apply, Derive, Teach mastery profile). The `/ladder` page already promises one continuous climb from mastery to producing knowledge. Research OS closes that promise for a school-age learner: a workspace where the learner finds, quotes, checks, and organizes primary sources over the same graph, a teacher view over the same states, and a path for an accepted student production to become a citable node that the hypothesis engine can consume.

Inputs: `_intake/research-os-k12/03-data-services.md` (vendors and data sources, verified 2026-09-09), `_intake/research-os-k12/04-funding-and-people.md` (funding flows and ranked people), `_intake/research-os-k12/raw/` (sixteen verbatim research reports), `learning/KNOWLEDGE-ARCHITECTURE.md`, `learning/EPIC.md`, `learning/research/_synthesis/DECISIONS.md`, `learning/research/LEARNING-SCIENCE-CANON.md`, `tools/hypothesis-engine/README.md`.

## 1. What is fixed and what is a hypothesis

Fixed, because every research stream found it to be the strongest point of alignment: the AI in the student workspace is limited to four tools (find, quote, check, organize) and never writes an answer for the learner; the code stays MIT; the canon stays free to read; the teacher keeps authority over any state determination.

Hypotheses, because no stream found direct evidence: the five learner states as a construct; frontier-backward routing as a better default than the forward route Academy already plans; citation payments as a motivator for school-age producers; an all-subjects graph as something one nonprofit can keep current. Each hypothesis gets a test in section 7 before it ships beyond a pilot.

## 2. Five learner states over the existing graph

The states describe a learner's relationship to one Concept Atom. They do not replace the Academy mastery profile; they sit on top of it and reuse its signals.

| State | Meaning | Signal that sets it | Academy depth it reuses | ICAP mode that can move it |
|---|---|---|---|---|
| Access | The atom is reachable: prerequisites are at Understanding or above, and the learner has opened it | Route exposure plus open event | none | Passive |
| Awareness | The learner can recall the atom's claim and place it in the graph | FSRS retrievability above the Academy recall threshold | Recall | Active |
| Understanding | The learner can apply or explain the atom in a fresh context | A constructive activity passed: self-explanation, worked example completion, or a quote-and-check task | Apply | Constructive |
| Internalization | The atom holds over time and transfers | FSRS stability above threshold and a delayed transfer item passed | Derive | Constructive, Interactive |
| Production | The learner has produced a claim with evidence and citations that reviewers accepted into the graph | Reviewed production record (section 5) | Teach | Interactive |

The mapping to ICAP (Chi and Wylie 2014, doi:10.1080/00461520.2014.965823), to Bloom's revised taxonomy, to SOLO (Biggs and Collis 1982, doi:10.1016/b978-0-12-097552-5.50007-7), and to Perkins's understanding performances is a stated hypothesis; SOLO and ICAP carry validation the five states lack, so the states are built as a mapping onto them and tested with a Rasch or IRT unidimensionality study before they drive routing on their own. Design decisions on the graph schema and routing go through child and teacher co-design before they are fixed (Druin 1999, doi:10.1145/302979.303166; Delgado and others 2023, doi:10.1145/3617694.3623261). Each state also names its KLI knowledge type (Koedinger, Corbett, and Perfetti 2012, doi:10.1111/j.1551-6709.2012.01245.x), since a memory-tuned review loop does not fit sense-making states. `RESEARCH-QUESTIONS.md` holds the validation study. Until that study runs, the state shown to a teacher carries a visible confidence and a contest path (section 4), following the audit critique in `raw/people-policy-critics.md`.

## 3. Frontier-backward routing

Academy's route (DECISIONS.md, Convergence 2) is a forward, reach-weighted walk over the knowledge-space outer fringe. Research OS adds a target: the learner or teacher picks a frontier node (a frontier-shell atom, or a live hypothesis from the hypothesis engine's ranked tournament) and the router walks the prerequisite graph backward to the learner's Understanding-or-above set, then emits the forward route from that set to the target. The API stays the one Academy plans (`route` returns an ordered list) with an optional `target` parameter. Expertise reversal (Kalyuga 2003) applies: supports fade as the learner's state rises. Two conditions from the educational-methods review (`_intake/research-os-k12/raw/lit-educational-methods.md`): the backward path must always resolve to a learning resource, because struggle before instruction pays off only when a resource follows (Schwartz and Martin 2004, doi:10.1207/s1532690xci2202_1; Kapur 2014, doi:10.1111/cogs.12107), and unsupported exploration is the failure mode Kirschner, Sweller, and Clark 2006 (doi:10.1207/s15326985ep4102_1) describe; and the tool's engagement rate is a primary design metric, since a well-funded coaching tutor produced near-zero gains when students did not open it (Oreopoulos and Low 2026, doi:10.3386/w35620). A scripted peer step at frontier nodes is planned for Phase 1, where collaboration helps most on high-complexity tasks (Kirschner, Paas, and Kirschner 2009, doi:10.1007/s10648-008-9095-2).

## 4. The workspace and the teacher view

Four tools, each returning a provenance envelope (the feed402 citation envelope: data, citation, receipt) so every result is traceable to a source with a license:

- **find**: retrieval over the canon, the mirrored OpenAlex and Crossref metadata, and the open-licensed sources in `03-data-services.md`; noncommercial-licensed content is findable and linkable and is excluded from the monetized citation flow.
- **quote**: exact spans with source id, canonical URL, license, and page or section; the tool refuses to paraphrase.
- **check**: entailment between a learner's claim and a quoted span, with abstain-on-weak-retrieval and closed-set citation validation (DECISIONS.md Convergence 3, requirements S1 to S7); the output is support, contradiction, or unknown, with the span, plus a guiding question or hint when the result is contradiction or unknown. The RCTs that produced gains used hints and questions (Bastani and others 2025, doi:10.1073/pnas.2422633122; Wang and others 2024, arXiv:2410.03017; VanLehn 2011, doi:10.1080/00461520.2011.611369); the tool still never writes the answer.
- **organize**: claim, evidence, and warrant scaffolds; outline and citation formatting; no generated prose beyond labels.

Interface patterns from the HCI review (`_intake/research-os-k12/raw/lit-hci-human-ai.md`): quote cards carry a position-sensitive link into the source and the surrounding sentence (Head and others 2021, doi:10.1145/3411764.3445648; Fok and others 2023, doi:10.1145/3581641.3584034); the organize step forces claim, quote, and rationale, the SciFact schema (Wadden and others 2020, doi:10.18653/v1/2020.emnlp-main.609); conflicting sources render side by side, the one pattern with direct evidence of better synthesis (Kang and others 2023, doi:10.1145/3586183.3606759); a citation the system cannot resolve to a fetched document never renders as a citation (Gao and others 2023, doi:10.18653/v1/2023.emnlp-main.398; Kalai and Vempala 2024, doi:10.1145/3618260.3649777); every AI-suggested sentence stays visibly marked until the learner edits it (Draxler and others 2023, doi:10.1145/3637875); find offers a graded hint ladder for a stuck learner (Kazemitabaar and others 2024, doi:10.1145/3613904.3642773); the system's initiative fades as state rises (Molenaar 2022, doi:10.1016/j.caeai.2022.100070); learners build their own claim-to-atom links, since self-constructed maps carry the effect (Nesbit and Adesope 2006, doi:10.3102/00346543076003413); and no raw belief score is ever shown to a student.

Teacher class view: a matrix of students by atoms colored by state, each cell opening the process trail (quotes gathered, checks run and their outcomes, productions submitted), a per-state confidence, and a contest control that lets a teacher override a state and records why. The view exposes process signals (state transitions, attempt diversity, self-explanation quality) beside any mastery figure, because task and process feedback carries the effect (Hattie and Timperley 2007, doi:10.3102/003465430298487) and formative use during instruction produced the 0.4 to 0.7 SD gains Black and Wiliam 1998 (doi:10.1080/0969595980050102) reviewed.

## 5. Productions and the hypothesis engine

A production is a first-class evidence record. The schema is a strict superset of what the engine's `hte.evidence.EvidenceItem` carries, so the engine can ingest accepted productions without an adapter beyond field mapping.

```yaml
production:
  id: prod.<ulid>
  atom_ids: [bp.thermo.boltzmann-distribution]   # Concept Atoms the claim attaches to
  claim: "..."                                    # one sentence, learner-authored
  stance: supports | refutes | extends            # relative to the atom's claim
  evidence_spans:
    - source_id: openalex:W...
      canonical_url: https://doi.org/...
      quote: "..."                                # exact span from the quote tool
      license: CC-BY-4.0 | CC0 | public-domain | citation-only
      locator: "p. 4" | "section 2.1"
  slots:                                          # filled when applicable, same names as hte
    actor: null
    action: null
    object: null
    place: null
    mechanism: null
    interval: null
  checks:
    - span_index: 0
      result: support | contradiction | unknown
  learner_state_at_submission: Understanding
  review:
    teacher: {id: ..., decision: accept | revise | reject, note: "..."}
    bucket_reviewer: {id: ..., decision: ..., note: "..."}
  registration:
    citable_id: null                              # DOI or compatible identifier on acceptance
    story_protocol_ip: null
    feed402_envelope: null
  payout:
    payee_type: guardian | custodial | none       # never the minor directly
    ledger_ref: null
```

Constraints from the AI-for-science review (`_intake/research-os-k12/raw/lit-ai-for-science.md`): the production record follows the nanopublication pattern (assertion, provenance, publication info; Groth, Gibson, and Velterop 2010, doi:10.3233/isu-2010-0613) so it can interoperate with systems that already speak it; a production arrives with raw signals (extraction confidence, check results, reviewer decisions) and never with a pre-computed belief tuple; check runs against full-document context (Wadden and others 2022); extraction and verification confidence stay separate; every production that enters the canon carries a named human sign-off (Birhane and others 2023, doi:10.1038/s42254-023-00581-4); and an artifact-validity instrument exists before any citation fee attaches (Auchincloss and others 2014).

Overlap map from the HCI review: evidence extraction and claim linking are shared machinery serving two graphs; belief scoring is shared computation that routes on the student side and is displayed with its evidence components to teachers only; the critic role on the student side is limited to checking whether a quote supports a claim, with disagreement routed to the teacher (Holstein and Aleven 2022, doi:10.1002/aaai.12058); the generator role never appears in the student workspace; provenance envelopes are shared, with a parent-readable rendering on the student side; graph traversal is shared and the ordering objective is not.

Two directions of overlap. Downstream: an accepted production becomes an evidence item with `supports` or `refutes` links, enters the engine's belief fusion with a detectability and tier appropriate to a reviewed student source, and is scored like any other item. Upstream: the engine's ranked hypotheses and its gap-node queue (`hte.unknowns.GapNode`, `value_of_information`) are frontier targets for routing; a class can be assigned a gap node, and productions that fill it feed the active-learning loop the engine README lists as still open. The first shared corpus is `quantum/07-history`, which the engine already ingests, so Phase 0 uses the history of quantum physics as its subject.

## 6. Vendor and data decisions

From `03-data-services.md`. Phase 0 runs on Vercel Pro (one seat), Supabase Free then Pro, Postgres adjacency tables for the graph, the existing Hetzner box for the x402 research gateway and batch ingest, Cloudflare Free, Sentry OSS, PostHog free, Resend free, Supabase Auth for students, Dynamic for contributor wallets only, the CDP facilitator for x402, GPT-4o mini or Claude Haiku 4.5 with prompt caching for the four tools (Gemini's API terms forbid applications directed at under-18 users), Voyage or OpenAI small embeddings, the OpenAlex snapshot mirrored locally, Crossref, Unpaywall, Europe PMC, PubMed, arXiv metadata, Wikidata, Smithsonian, NASA, NOAA, USGS, Our World in Data, Gapminder, Gutenberg. Budget about $50 to $200 per month.

Excluded from the monetized citation flow: every noncommercial or citation-only source (Khan Academy, OpenStax, MIT OCW, PhET, MSC 2020, Semantic Scholar CC-BY-NC sets, the Kruse corpus, PMC and Europe PMC CC-BY-NC slices). Excluded from caching: Britannica, Stanford Encyclopedia of Philosophy, CK-12 until its license is read, Elsevier, Wiley, Springer Nature paid APIs, Clarivate, JSTOR, Dimensions. The full list is section "Licensing landmines" of `03-data-services.md`.

Phase 2 at 10,000 students runs about $2,000 per month baseline and about $5,500 with SOC 2 tooling, a consent vendor, Supabase Team, OpenAlex membership, and Clever Secure Sync.

## 7. Minors and compliance

- Age gate in-house with neutral wording; verified parental consent for under-13 through PRIVO or k-ID; k-ID AgeKit for classification.
- SDPC National Data Privacy Agreement signatory; Common Sense Privacy evaluation; Digital Promise Responsibly Designed AI certification; 5Rights Children and AI Design Code checklist; Digital Public Goods registration; an EU AI Act Annex III opinion before any EU deployment; the 2025 COPPA amendments' retention rule (no "model improvement" retention).
- No student data used to train models. Zero retention for personal data of under-13 users at the model provider.
- Payouts: guardian-as-payee or a custodial account for any contributor under 18; Coogan-style trust handling where state law requires it (California, Illinois, Minnesota, Utah); parental visibility into every payment; a jurisdiction opinion before payouts are enabled. Recognition and a custodial ledger ship before liquid payouts. Citation payments launch only beside a no-payment control arm, because the literature the mechanism builds on (self-explanation, productive failure) never tested a financial incentive, and because the Nigeria RCT found the largest AI-tutoring gains among already-higher performers (De Simone and others 2025, doi:10.1596/1813-9450-11125), a pattern an acceptance gate could widen.
- The payment rail stays unbranded in student and teacher surfaces.

## 8. Phases

| Phase | Scope | Exit test |
|---|---|---|
| 0, prototype | History of quantum physics, grades 9 to 12, the `quantum/07-history` corpus plus canon 02-physics; four tools; state matrix; production schema; one teacher and one librarian as design partners | A learner can route backward from one engine hypothesis, gather quotes with provenance, pass checks, and submit a production the engine ingests |
| 1, pilot | Two classrooms (candidates: Peninsula School District, Iowa City), a pre-registered study comparing the constrained workspace, a permissive tutor, and no AI on delayed transfer items; outcomes published in the open | Study registered and run; state mapping paper drafted; first accepted productions registered with citable ids |
| 2, district-ready | Three to ten districts on NDPAs; Clever or Classroom rostering; LTI 1.3 into Canvas and Schoology; verified consent for under-13; guardian-as-payee payouts | Vendor stack per `03-data-services.md` Phase 2; Common Sense rating; Digital Promise certification |

## 9. Funding sequence

From `04-funding-and-people.md` section 2.1: Fast Forward (2026-09-18), Tools Competition registration (cycle opening now), NewSchools application, DPG registration, Renaissance Philanthropy inquiry, NLnet NGI Zero for feed402 (2026-11-03), Sentry OSS and Cloudflare Galileo and Vercel for Startups, a fiscal sponsor, then the university partner needed for IES, NSF, and EIR paths.

## 10. Engine changes the literature asks for

Recorded here for the hypothesis-engine owners; each is a bead candidate under the existing `bkt-hte-` prefix. A named human sign-off on every hypothesis that crosses into canon, alongside the judge score. Cross-family models for generator and judge, or drop the independence claim. Label tournament rankings as unvalidated until a discovery-date holdout track record exists for rankings, as distinct from single claims. Insert a full-document context check between extraction and belief fusion. Stress-test fusion on conflicting evidence sets (Yager 1987, doi:10.1016/0020-0255(87)90007-7). Add an understanding axis (compression, parsimony, generalization; Krenn and others 2022, doi:10.1038/s42254-022-00518-3) beside the belief score. Check that the address scheme preserves all thirteen Allen interval relations (Allen 1983, doi:10.1145/182.358434) instead of forcing a total order. Run calibration on a fixed published cadence, CASP-style.

## 11. Work items

Filed as `ros-01` through `ros-10` in `BEADS-PENDING.jsonl`: plan acceptance; state model and mapping paper; route API with target; four-tool workspace over the Phase 0 corpus; production schema and engine adapter; teacher view; minors compliance pack; evidence infrastructure and pre-registration; funding wave 1; site page and intake. `CHANGE-LEDGER.md` records every file this work adds or edits.

## Revision 1

`PLAN-REVISION-1.md`, alongside this file, reads PRs #3 through #15 and the batch-two literature evidence (`intake/ros-literature-2-batch2`, open as PR #15) against this plan: what shipped, four evidence-driven design revisions to the payout, routing, testbed, and Check-tool design above, a dependency-ordered Phase 1 scope with five blocking founder decisions, a mapping of the twelve overlap-map research questions onto pilot-scale versus district-scale answerability, and the ETH AI Center fellowship fit. This file stays the iteration-1 record; `PLAN-REVISION-1.md` is where the revision lives.
