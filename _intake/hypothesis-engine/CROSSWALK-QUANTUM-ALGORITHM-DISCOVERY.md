# Crosswalk: History Hypothesis Engine vs Quantum Algorithm Discovery

Status: DRAFT. Date: 2026-09-09. Reads against `HISTORY-HYPOTHESIS-ENGINE-SPEC.md`, `TIMELINE-AND-COMBINATORICS-SPEC.md`, `IDEAL-STATE-AND-UNKNOWNS-SPEC.md`, and `gianyrox/quantum-algorithm-discovery` (package `scientific-discovery`, v0.11).

## 1. Relationship

Both engines run the same four-stage pipeline: broad evidence retrieval, extraction of a derived research object from that evidence, a cross-domain or cross-cluster structural search over derived objects, and a target search against a fixed comparison set. Quantum Algorithm Discovery (QAD) retrieves papers, extracts a `ProblemInstance` from each one, searches for structural families across disciplines, and maps surviving families against known quantum algorithms. The history hypothesis engine retrieves claims and correlations already on file in the sacred-history corpus, extracts a `Hypothesis` from evidence clusters, searches for evidence clusters and cross-period analogies, and scores each hypothesis against a truth-credence target. Both hold one governing rule in common: the artifact under study is evidence, and the object the engine reasons about is derived from that evidence, never the artifact itself. QAD names that object `ProblemInstance`; the history specs name it `Hypothesis`. QAD is ahead on retrieval and on the audit machinery around it, coverage, saturation, provenance. The history specs are ahead on the target-search stage's belief math, work a paper-only engine has not needed yet.

## 2. Module Crosswalk

| Capability | History specs | QAD module or doc | Status |
|---|---|---|---|
| Gateway-first retrieval envelopes, `RetrievalRun` provenance | Not modeled; the specs assume a corpus already on file | `retrieval/feed402.py`, `feed402_store.py`, `gateway.py`, `gateway_harvest.py`; `retrieval_run`/`retrieval_hit`/`feed402_envelope` in `DATA_MODEL_V0.2.md`, `GATEWAY_FIRST_V0.11.md` | Missing in specs |
| `EvidenceSpan` grounding | HISTORY §3 `evidence[]` grounds at claim level (`locator`, `quote`, `summary`) | `problems/evidence.py`, `FieldConfidence`, `PROBLEM_EXTRACTION_V0.10.md` grounds at field level | QAD ahead |
| Extractor ensembles, `ProblemQualityReport` | HISTORY §2 folds four disjoint systems (A-D) into one score, the disjointness the spec exists to close | `problems/ensemble.py`, `problems/quality.py`; ensemble output never auto-becomes truth by vote | Missing in specs (specs collapse where QAD preserves disagreement) |
| Multi-view similarity vs single blended `e_i` | HISTORY §2 `e_i = min(0.99, 0.40·cos + 0.25·fuz + 0.10·motif)`, one scalar | `analysis/multiview.py`; `STRUCTURE_DISCOVERY_V0.10.md` keeps task-family, math, operator, topology, complexity, and lexical views separate | Missing in specs |
| Lexical/citation penalty on surprising candidates vs CANON-TRUTH-PATTERNS non-obvious score | TIMELINE §4 `X(K)` rewards cross-kind corroboration, reusing the branch-distance coefficient | `STRUCTURE_DISCOVERY_V0.10.md`: lexical and citation similarity are penalized when ranking surprising cross-domain candidates | Match, opposite sign on the same move: QAD penalizes surface closeness, specs reward evidence-kind distance |
| `ProblemFamily` connected components vs evidence clusters | HISTORY §5 clusters claims by embedding-fuzzy-motif similarity | `analysis/family_builder.py`, `analysis/clustering.py`; `STRUCTURE_DISCOVERY_V0.10.md` induces families from a similarity graph via connected components | Match |
| Audited saturation, coverage strata vs coverage-with-interval, missing mass | IDEAL-STATE §8 replaces "full set" with `coverage_share`, `ci_low`, `ci_high`, and a Chao1 missing-mass estimate | `coverage/saturation.py`, `coverage/strata.py`; `COVERAGE_FEEDBACK_V0.10.md`'s three-part stopping rule and field/decade/language/provider/access stratification, no richness estimator | QAD has the empirical stopping rule; specs have the statistical interval. Neither has both |
| Active retrieval priority vs gap nodes ranked by value of information | IDEAL-STATE §5 gap nodes carry `expected_delta_u`, `decision_weight`, `voi_score` | `coverage/active.py`; `COVERAGE_FEEDBACK_V0.10.md` combines uncertainty, novelty, coverage gap, historical gap, provider disagreement | Match, QAD's ranking is ad hoc where the specs' VoI score is a named quantity |
| Unknown vocabulary handling vs open-world `OTHER` slots | IDEAL-STATE §6a `OTHER` concept with Dirichlet-process reserved mass | `ontology/gaps.py`, `ontology/feedback.py`; `COVERAGE_FEEDBACK_V0.10.md`'s reviewable candidate-term workflow | Match, different mechanism: QAD routes to a human reviewer, specs reserve probability mass so scoring proceeds before review |
| Quantum-blind corpus construction vs generation independent of literature support | TIMELINE §3/§5: generation is complete and independent of what the literature supports | `RESEARCH_CHARTER.md` core principle; `ARCHITECTURE_V0.10.md` invariant 2, "Retrieval does not search for quantum relevance" | Match, the same rule stated for two different target sets |
| Negative results discipline vs surprise tracking | IDEAL-STATE §6c logs an unknown-unknown event when evidence fits no address; TIMELINE §5 keeps refuted hypotheses on the frontier, never a verdict | `RESEARCH_CHARTER.md` "Negative results," a named list of failure modes filed as first-class output | Missing in specs: no doctrine that a hypothesis collapsing to near-zero credence is itself a filed research result |
| Provider disagreement vs prior-profile robustness | IDEAL-STATE §6d scores one hypothesis under four prior profiles and reports the spread | `coverage/active.py`'s provider-disagreement signal measures disagreement between retrieval sources about one fact | Different axis of disagreement, both missing the other's version |
| Campaign with frozen works and strata vs holdout tests | HISTORY §6 period holdout: withhold one period, generate from the rest, test the predicted tuples against the withheld claims | Campaign 001, 24 frozen works across eight sampling strata, `execution/campaign.py` | Match |
| Subjective-logic opinion `(b, d, u, a)` | IDEAL-STATE §2 | No analog in the ten docs reviewed | Missing in QAD |
| Stemma source dependence, `n_eff` | IDEAL-STATE §3 | `corpus/identity.py`, `corpus/resolution.py` dedupe the same work across providers; no dependency graph for two different works that copy from a shared source | Missing in QAD |
| Detectability term scaling absence evidence | IDEAL-STATE §4 | `LIMITS_V0.10.md` states the principle, "Provider absence is not evidence that a work or concept does not exist," with no scaling table | Same principle, missing in QAD as a mechanism |
| Allen-relation timeline, period/era nesting | TIMELINE §1 | No temporal-ordering engine; QAD has no dated-object algebra | Missing in QAD |
| Prime-factorization (Gödel) addressing | TIMELINE §3 | `core/ids.py` issues opaque identifiers; TIMELINE §3 itself names and rejects the opaque-hash alternative for its own reasons | Missing in QAD |
| Self-report per generation run | IDEAL-STATE §7 | `reproducibility/manifest.py`, `ARCHITECTURE_V0.10.md` invariant 10 pins corpus, ontology, extractor, and model versions | QAD pins versions; specs want the epistemic audit (assumptions, missing-mass, calibration) layered on top |

## 3. What QAD's Charter Flags That the Timeline Engine Answers

`STRUCTURE_DISCOVERY_V0.10.md` lists nine outcomes a cross-domain review can resolve to and flags two as work its baseline classifier cannot do alone: "Historical transmission and independent rediscovery require literature-history evidence and review." QAD has no literature-history apparatus. The timeline engine is that apparatus, built for a different corpus.

Deciding historical transmission needs two facts about a pair of works: which one came first, and whether a dependency path connects them. The 13 Allen relations in `TIMELINE-AND-COMBINATORICS-SPEC.md` §1 (before, meets, overlaps, and the rest) answer the first fact for any two dated nodes. The stemma dependency graph in `IDEAL-STATE-AND-UNKNOWNS-SPEC.md` §3, `copies_from` and `shares_archetype_with` edges with a copy-confidence weight, answers the second. A pair joined by a `before` or `meets` relation and a stemma path reads as historical transmission; a pair with an `overlaps` or unrelated temporal relation, no stemma path, and independently sourced evidence clusters reads as independent rediscovery. `HISTORY-HYPOTHESIS-ENGINE-SPEC.md` already carries this exact split as a field, `hypothesis_type: diffusion` against `independent-invention`, scored by the same truth-score math a QAD candidate would use.

The parallel holds without a shared codebase: two flagged `ProblemInstance` matches would need the same pair of facts, an Allen relation over their works' publication dates and a stemma lookup over their citation and authorship edges, to resolve the same way. The history engine builds that apparatus for its own corpus; QAD's doc names the gap without building it. Each engine stays free to build its own copy.

## 4. What We Pull Over

The engines stay separate. QAD keeps `scientific-discovery`; bucket-foundation keeps the history hypothesis engine. Nothing moves between repos. Where QAD's v0.11 already solved a problem the history specs share, that pattern gets rebuilt inside the history engine, credited at the point it lands.

| Pattern pulled from QAD v0.11 | Lands in |
|---|---|
| Immutable retrieval envelopes with `RetrievalRun` provenance via `x402-research-gateway`/feed402 | HISTORY §8 (Implementation Plan), TIMELINE §1 (Timeline Data Structure) |
| `EvidenceSpan` on every evidence item | HISTORY §3 (Hypothesis Data Model) |
| Extractor ensembles with a quality report for claim extraction | HISTORY §5 (Hypothesis Generation Loop) |
| Multi-view similarity replacing the single blended `e_i`, system A's formula kept as one view | TIMELINE §4 (Truth Score as Additive Prime Knowledge) |
| Audited saturation as the gate before a coverage interval is reported | IDEAL-STATE §8 (Coverage Claim) |
| Active retrieval priority formula merged into the gap-node VoI ranking | IDEAL-STATE §5 (Known Unknowns as Gap Nodes) |
| Campaign structure: frozen works, sampling strata, failures recorded before repair | HISTORY §6 (Falsification and Holdout) |
| Target-blind corpus construction, the generalization of quantum-blind | IDEAL-STATE §7 (The Model Accounting for Itself) |

Each row is amended directly into its spec below, marked "Pulled from QAD v0.11" so the provenance stays visible next to the math it sits beside.

## 5. Bead Re-Cut

DROP means superseded in-spec. KEEP means bucket-original work with no QAD pattern to pull. PULL means a `bkt-hte-*` bead that builds a QAD-observed pattern directly inside the history engine.

- **bkt-hte-truth-score**: DROP. Superseded in-spec by `bkt-hte-opinion-model`.
- **bkt-hte-hypothesis-schema**: KEEP. Bucket data model, no QAD analog needed.
- **bkt-hte-period-model**: KEEP. History-specific period tree.
- **bkt-hte-generator**: DROP. Superseded in-spec by `bkt-hte-combinatorial-generator`.
- **bkt-hte-tournament**: KEEP. Elo debate ranking has no QAD counterpart.
- **bkt-hte-holdout**: PULL. Adds QAD's frozen-works, sampling-strata, failures-before-repair campaign discipline to the period holdout test.
- **bkt-hte-review-queue**: KEEP. Uncertainty-times-impact budgeting is bucket's own design; no matching QAD pattern.
- **bkt-hte-ui**: KEEP. Bucket-facing route.
- **bkt-hte-timeline-schema**: KEEP. Allen relations and the year axis; QAD has no dated-object algebra to pull from.
- **bkt-hte-concept-ontology**: KEEP. History slot vocabulary and the five non-consensus actors.
- **bkt-hte-address-scheme**: KEEP. Prime addressing is bucket's own invention; QAD uses opaque ids.
- **bkt-hte-combinatorial-generator**: KEEP. Works only because history's slot vocabularies are small and closed.
- **bkt-hte-kind-truth-score**: DROP. Superseded in-spec by `bkt-hte-opinion-model`.
- **bkt-hte-timeline-views**: KEEP. Bucket-specific per-bin/per-event/per-pair export shape.
- **bkt-hte-opinion-model**: KEEP. Subjective-logic belief has no QAD analog to pull.
- **bkt-hte-stemma-dependence**: KEEP. Source-dependency stemma has no QAD analog to pull.
- **bkt-hte-detectability-table**: KEEP. QAD states the absence-is-not-evidence principle but has no scaling mechanism to pull.
- **bkt-hte-gap-nodes**: PULL. Merges QAD's five-factor active-retrieval priority into the gap node's `voi_score`.
- **bkt-hte-open-world-slots**: KEEP. Dirichlet reserved mass has no QAD analog; QAD routes unknown terms to a human reviewer instead.
- **bkt-hte-missing-mass**: PULL. Gates the Chao1/Good-Turing coverage interval behind QAD's three-part audited-saturation stopping rule.
- **bkt-hte-surprise-and-robustness**: KEEP. Prior-profile spread scoring has no QAD analog.
- **bkt-hte-self-accounting**: PULL. Adds the target-blind generalization of QAD's quantum-blind rule to the self-report and model-prior evidence kind.
- **bkt-hte-retrieval-provenance**: PULL, new. Immutable retrieval envelopes linked to a `RetrievalRun`, over `x402-research-gateway`/feed402 once the sacred-history mirror jobs route through it.
- **bkt-hte-evidence-span**: PULL, new. Field-level `EvidenceSpan` on every `evidence[]` entry, in place of claim-level-only grounding.
- **bkt-hte-extraction-ensemble**: PULL, new. Ensemble claim extractors plus a quality report, preserving disagreement instead of collapsing straight to one score.
- **bkt-hte-multiview-evidence**: PULL, new. Separate similarity views (task, math, motif, lexical, citation) feeding `e_i`, system A's blended formula kept as one view among several.

Counts: 3 DROP, 15 KEEP, 8 PULL.

Ordered first five to execute:

1. `bkt-hte-evidence-span`
2. `bkt-hte-hypothesis-schema`
3. `bkt-hte-opinion-model`
4. `bkt-hte-concept-ontology`
5. `bkt-hte-multiview-evidence`

## 6. Open Decisions for the Founder

1. **Target-blind as a general rule.** QAD's charter states that quantum relevance never biases corpus construction. Decide whether the history engine adopts the same rule by name, generation stays independent of which target reading, orthodox or fringe, a hypothesis would flatter, and whether that rule belongs in `IDEAL-STATE-AND-UNKNOWNS-SPEC.md` §7 as written or as a standalone principle.
2. **Benchmark scope and order.** QAD runs its frozen-works campaign before scaling generation. Decide whether the history engine's first campaign-style holdout run, under `bkt-hte-holdout`, happens before `bkt-hte-combinatorial-generator` ships, and how many periods and strata the first frozen set should cover.
