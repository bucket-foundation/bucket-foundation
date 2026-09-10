# History Hypothesis Engine: Design Spec

Status: DRAFT. Date: 2026-09-09.

## 1. Problem

Four disjoint scores exist for claims in this corpus, and none of them measures truth.
Embedding similarity, paper quality, a tier softmax, and a keyword count each answer a different question about a claim.
A reader asking how likely an account of history is to be correct gets four incompatible numbers instead of one probability.
The corpus needs an engine that generates the full set of plausible hypotheses from claims and evidence already on file, spanning nested periods from era to year.
Each hypothesis needs one 0-to-1 posterior credence that composes the four existing signals, stays contestable, and leaves what those signals already mean untouched.

## 2. Truth Score Model

Every hypothesis and every claim gets one posterior credence τ, computed in log-odds space so each signal adds instead of multiplies:

```
L = L_prior + ΔL_evidence − Ω_contradiction + Θ_temporal
τ = 1 / (1 + e^(−L))
```

- `L`: total log-odds for the hypothesis or claim.
- `τ`: the posterior credence, the 0-to-1 truth score.
- `L_prior`: log-odds of the prior, before any specific evidence for this hypothesis is weighed.
- `ΔL_evidence`: net log-odds from supporting minus refuting evidence clusters.
- `Ω_contradiction`: penalty subtracted when both sides carry real weight.
- `Θ_temporal`: agreement between the hypothesis's interval and its period's date posterior (§4), 0 when no date claim is tested.

τ is a posterior credence: the corpus's current estimate that a hypothesis is true. The per-evidence confidence fields systems A through D write keep their original meaning as calibrated weight of cited support.

**Prior.** Half from system B (paper-quality score, `tools/canon-pipeline/scoring.py`), half from system C (tier-classifier softmax, `_intake/training/tier-predictions.jsonl`):

```
p0 = α · (score_B / 100) + (1 − α) · confidence_nucleus_C      [α = 0.5]
L_prior = ln( p0 / (1 − p0) )
```

`score_B` is the existing 0-100 heuristic (peer review, citations, age, open access, venue, retraction). `confidence_nucleus_C` is the softmax weight the tier classifier assigns to "nucleus" for the claim's underlying pattern. Together they set how established the claim reads in the corpus.

**Evidence.** `ΔL_evidence` and `Ω_contradiction` come from the claim's `evidence[]` array (`ENTITY-MODEL.md` §5). Group evidence by independent provenance (distinct `provenance.asserted_by` or citation) into clusters, one per independent line of support or refutation. For cluster *i*:

```
s_i = k(tier_i) · e_i
```

`tier_i` is a source-reliability tier, reusing the T1-T6 scale already defined in `quantum/evidence/SCHEMA.md`. A `score_B`-scored source maps to a tier by band: ≥80→T1, 60-79→T2, 40-59→T3, 20-39→T4, 1-19→T5, unscored or keyword-only→T6. `k(tier)` is a fixed weight table: T1=2.0, T2=1.5, T3=1.0, T4=0.5, T5=0.25, T6=0.1, the maximum log-odds swing one independent piece of evidence at that tier contributes.

`e_i` is the per-evidence edge strength. For a cross-tradition correlation edge, `e_i` is system A's formula from `build-entity-graph.py` lines 299-303, unchanged:

```
e_i = min(0.99, 0.40·cos + 0.25·(fuz/100) + 0.10·|motif_overlap|)
```

For a keyword-derived sub-claim with no embedding computed, `e_i` falls back to system D's pattern-signal integer score: `e_i = min(1, score_D / 10)`.

**Corroboration and contradiction.** Corroboration gets diminishing returns instead of a straight sum. For *n* independent clusters on one side with mean strength *S*:

```
D(n) = 1 + λ · ln(1 + n)        [λ = 0.5]
ΔL_evidence = D(n_+)·S_+ − D(n_-)·S_-
Ω_contradiction = μ · min( D(n_+)·S_+ , D(n_-)·S_- )      [μ = 0.5]
```

`S_+`/`n_+` and `S_-`/`n_-` are the mean strength and count of the supporting and refuting clusters. The contradiction term pulls a hypothesis toward 0.5 whenever both sides carry real weight, so one contested by an equally strong opposing claim sits near even odds regardless of which side's total is a fraction larger.

**Worked example.** Take correlation `clm-corr-figure-mapping-8d76c0b84f` (Manu ↔ Deucalion, `src/data/sacred-history.json`), whose system-A evidence gives cos=0.934, fuz=17.6, 3 shared motifs: `e = 0.40·0.934 + 0.25·0.176 + 0.10·3 = 0.718`, the `confidence` already stored on the correlation. That number is a similarity weight, and it is the only signal currently attached to this correlation; systems B and C have nothing on file for it yet, the disjointness this spec closes.

Suppose the engine links a comparative-mythology review, `score_B = 55` (→T3, k=1.0), supporting the shared-source reading in two independent clusters, side_a and side_b locators, and the tier classifier scores the flood-motif pattern at `confidence_nucleus = 0.30`. A rival paper on independent invention scores `score_B = 70` (→T2, k=1.5), argument strength `e = 0.6`, one cluster.

```
p0 = 0.5·0.55 + 0.5·0.30 = 0.425          L_prior = ln(0.425/0.575) = -0.30
D(2) = 1 + 0.5·ln 3 = 1.55    S_+ = 0.718
D(1) = 1 + 0.5·ln 2 = 1.35    S_- = 0.90
ΔL_evidence = 1.55·0.718 − 1.35·0.90 = -0.10
Ω = 0.5 · min(1.11, 1.21) = -0.56
Θ = 0  (no date claim tested)
L = -0.30 - 0.10 - 0.56 = -0.96
τ = 1 / (1 + e^0.96) ≈ 0.28
```

The stored correlation `confidence` stays 0.718. The new `truth_score.posterior` is 0.28, the credence that a common source produced both figures once the counter-evidence and the pattern's edge-leaning standing are folded in. G-4 (`AI-BRANCH-ANALYSIS.md` line 101) already calls confidence a calibrated weight; τ is the posterior credence built on top of it, and neither field overwrites the other.

## 3. Hypothesis Data Model

A hypothesis extends the `claim` object (`ENTITY-MODEL.md` §5) with `claim_type: "hypothesis"`, the way `correlation` extends it with `side_a`/`side_b`. Where a claim's `object` names one node, a hypothesis's object is a set of claims plus a time interval and a period assignment:

```jsonc
{
  "id": "hyp-younger-dryas-cataclysm-diffusion",
  "node_type": "hypothesis",
  "claim_type": "hypothesis",
  "hypothesis_type": "diffusion",  // diffusion|common-source|independent-invention|
                                    // causal|dating|identification|periodization
  "statement": "A Younger Dryas cataclysm is the common source for flood motifs across at least three traditions.",
  "who": ["manu", "deucalion", "noah"],
  "what": "flood-motif-transmission",
  "when": {
    "start": {"year": -10800, "calendar": "proleptic-gregorian", "uncertainty_years": 200, "distribution": "oxcal-posterior"},
    "end":   {"year": -9600,  "calendar": "proleptic-gregorian", "uncertainty_years": 200, "distribution": "oxcal-posterior"}
  },
  "where": ["near-east", "anatolia"],
  "why": "climate-shock-common-source",
  "causal_direction": "common-cause", // a-causes-b|b-causes-a|common-cause|
                                       // independent-invention|coincidence|undetermined
  "period_assignment": [
    {"period_id": "per-younger-dryas", "role": "spans"},
    {"period_id": "per-early-holocene", "role": "bridges"}
  ],
  "claims": ["clm-corr-figure-mapping-8d76c0b84f", "clm-flood-genesis", "clm-flood-gilgamesh"],
  "depends_on": [],
  "conflicts_with": ["hyp-flood-independent-invention"],
  "evidence": [ /* pooled from member claims' evidence[], §5 shape unchanged */ ],
  "truth_score": {
    "posterior": 0.28,
    "prior": 0.425,
    "log_odds": -0.96,
    "components": {"L_prior": -0.30, "delta_evidence": -0.10, "contradiction": -0.56, "temporal": 0},
    "engine_version": "hte-0.1",
    "computed_at": "2026-09-09"
  },
  "provenance": {
    "asserted_by": "hypothesis-engine",
    "derived_by": {"model": "hte-0.1", "run_id": "hte-20260909-01", "generator": "cluster"}
  },
  "counter_claims": ["hyp-flood-independent-invention"],
  "story_protocol_ip_id": null
}
```

`claims[]` is a set, capturing how several existing claims relate. `depends_on[]` and `conflicts_with[]` extend `counter_claims[]` with a directed edge for hypotheses that presuppose or exclude each other, the graph the evolver (§5) walks. `truth_score` is new and additive, layered above the per-evidence `confidence` fields systems A through D already write. `evidence[]` keeps the exact §5 shape (`kind`, `locator`, `source_node`, `rights_tier`, `quote`, `summary`, `supports`), so existing claim readers keep working.

**Pulled from QAD v0.11:** each `evidence[]` entry adds an `evidence_span` field, `{"section": ..., "start_char": ..., "end_char": ..., "field": "who"|"what"|"when"|"where"|"why"|"causal_direction"}`, naming which hypothesis field the span supports rather than the hypothesis as a whole. `scientific-discovery`'s `EvidenceSpan` (`PROBLEM_EXTRACTION_V0.10.md`) grounds a `ProblemInstance` at this same per-field resolution; a hypothesis's `evidence[]` array grounded only at the claim level before this addition.

## 4. Timeline and Periods

The engine partitions history into a `period` node, nested four levels deep: era, period, event, year. Each period shares the envelope from `ENTITY-MODEL.md` §1:

```jsonc
{
  "id": "per-younger-dryas",
  "node_type": "period",
  "level": "period",          // era|period|event|year
  "parent": "era-late-pleistocene",
  "label": "Younger Dryas",
  "interval": {"start": {"year": -12900, "precision": "century"}, "end": {"year": -9700, "precision": "century"}},
  "date_posterior": {"mean": -11300, "hpd_68": [-11900, -10700], "hpd_95": [-12500, -10100], "model": "oxcal-phase-yd-01"},
  "region": ["global"],
  "disputed": false
}
```

`interval` reuses the `year`/`precision`/`disputed` shape the timeline array in `src/data/sacred-history.json` already carries on every anchor event; a period is what an anchor event becomes once it needs a start, an end, and children. `date_posterior` comes from an OxCal-style phase model, a Gibbs-sampled Bayesian chronology over every timeline anchor touching the period, each anchor treated as an observation with an error term set by its `precision` field (century ≈ 100-year 1-sigma, decade ≈ 10-year, exact ≈ near zero). The model writes the mean and highest-density intervals onto the period node; `Θ_temporal` (§2) scores a hypothesis by how much of its stated interval falls inside the relevant period's `hpd_68`.

A hypothesis spans a period when its `when.start`/`when.end` sits inside the period's interval, and bridges two or more periods when its `causal_direction` claims a mechanism whose cause and effect sit in different periods, recorded per `period_assignment[]` entry with a `role` of `spans` or `bridges`. A period can belong to more than one era, since a regional and a global chronology can claim overlapping centuries; `parent` is one pointer per framing, so a period node can appear under two eras.

## 5. Hypothesis Generation Loop

The loop follows the DeepMind co-scientist shape, generate, critique, rank, evolve, review, with MC-NEST's explicit explore/exploit control on the ranking step.

**Generator.** Four sources feed hypotheses, each bounded to what the graph already holds:

- Evidence clusters: group claims by system A's embedding-fuzzy-motif clustering, then enumerate who, what, when, where, why, and causal direction from the cluster's own claims.
- Claim gaps: a node with a required predicate missing (a figure whose historicity is contested with no dating claim attached) yields a hypothesis proposing that predicate.
- Contradictions: two claims with comparable priors that conflict yield a hypothesis reconciling or arbitrating them.
- Cross-period analogies: a motif recurring in claims from distant periods yields a hypothesis testing common cause against independent recurrence.

```
for cluster in cluster_evidence(claims, edge_confidence=build_entity_graph.edge_confidence):
    axes = {
        "who":   entities_in(cluster),
        "what":  predicates_in(cluster),
        "when":  candidate_intervals(cluster, periods),
        "where": sites_or_traditions_in(cluster),
        "why":   CAUSAL_RELATIONS,   # diffusion-a-to-b, diffusion-b-to-a,
                                     # common-source, independent-invention, coincidence
    }
    for combo in product(*axes.values()):
        h = build_hypothesis(cluster, combo)
        if not has_min_evidence(h):        # >=1 locator per side, mirrors G-2
            continue
        h.truth_score = truth_score(h)     # section 2
        if h.truth_score.posterior < CREDENCE_FLOOR:
            continue
        frontier.append(h)

frontier += critic_filter(
    generate_from_gaps(claims) +
    generate_from_contradictions(claims) +
    generate_from_cross_period_motifs(claims, periods)
)
frontier = top_n(frontier, N_MAX_PER_CLUSTER)
```

**Critic.** A rule-and-model pass rejects combinations the graph itself contradicts, a `who` not attested inside the proposed `when`, a `where` outside every tradition the `who` belongs to, before scoring.

**Pulled from QAD v0.11:** the who/what/when/where/why enumeration above runs through a `ClaimExtractorEnsemble` instead of one fixed rule. The first member stays the existing embedding-fuzzy-motif rule extractor; later members can be a local or remote LLM extractor implementing the same protocol. Ensemble members disagreeing on a slot value is not resolved by majority vote inside the generator; each disagreement is recorded on a `HypothesisQualityReport` (completeness of the who/what/when/where/why tuple, evidence-span coverage per field) attached to the hypothesis before it enters the frontier, mirroring `scientific-discovery`'s `ProblemExtractorEnsemble` and `ProblemQualityReport` (`PROBLEM_EXTRACTION_V0.10.md`).

**Ranking tournament.** Elo is seeded from the posterior, `Elo0 = 1500 + 400·logit(posterior)`, then updated by pairwise debate rounds as in the co-scientist tournament, ordering the frontier for review and for the evolver's pairing choices. Every fixed number of rounds, `truth_score` recomputes exactly from §2 and Elo reseeds from it, keeping the posterior authoritative.

**Evolver.** Recombines two hypotheses sharing a cluster into one with a merged claim set, splits an overbroad hypothesis into narrower dated children, and generalizes a narrow hypothesis into a broader periodization claim once several narrow siblings agree.

**Meta-review.** Aggregates the surviving frontier into a summary card per cluster and files it into the founder review queue (§7).

**The full set** is exactly this combinatorial enumeration over who/what/when/where/why/causal-direction for every evidence cluster in the graph, pruned to `N_MAX_PER_CLUSTER` by truth score before the tournament and to everything above `CREDENCE_FLOOR` after scoring. It is bounded by the evidence already in the graph: the generator draws every axis value from claims on file and never invents a locator, the same rule G-2 already enforces for correlations.

## 6. Falsification and Holdout

Two holdout splits test whether a posterior predicts unseen evidence.

**Discovery-date holdout.** Split each claim's `evidence[]` at a cutoff on `provenance.added_on`, recompute `truth_score` from pre-cutoff evidence only, then check whether the post-cutoff evidence's `supports` sign matches what the pre-cutoff posterior implied (posterior above 0.5 predicts the next independent piece of evidence supports). Score the match rate as a Brier score across every hypothesis with holdout evidence.

**Period holdout.** Withhold every claim assigned to one period, generate hypotheses from the remaining periods only, then test the withheld period's real claims against the predicted who/what/when/where/why tuples for a match rate. This checks the engine against the claims graph for that period, the caution the Hist-LLM benchmark raises about a model's memorized sense of a period from training data.

Both Brier scores feed a recalibration pass over §2's tunable constants (α, λ, μ), fit by grid search and re-run on a schedule as the corpus grows. Each recalibration carries a `run_id`, the same audit pattern `build-entity-graph.py` already writes.

**Pulled from QAD v0.11:** both holdout splits run inside a named campaign instead of an ad hoc script call. A campaign fixes a frozen work set (the claims and correlations eligible for that run, sampled across explicit strata, period, tradition, evidence kind, rights tier) before generation starts, so the holdout sample is drawn the same way every recalibration. Extraction, scoring, and matching failures on the frozen set are recorded in the campaign's run log before any repair lands, the discipline `scientific-discovery`'s Campaign 001 runs against its 24 frozen works and eight sampling strata (`README.md`, `RESEARCH_CHARTER.md`). The first campaign, `hte-campaign-001`, is the vehicle for both holdout splits above.

## 7. Human Review Budget

Every hypothesis with a posterior inside a review band, 0.15 to 0.85 by default, or flagged high-impact (touches a nucleus-tier claim, bridges two periods, or would attach a `counter_claims[]` link to an existing correlation) enters a founder review queue. A fixed weekly budget, 20 by default, orders the queue by how close the posterior sits to 0.5 combined with tournament Elo, so the most contested and most consequential hypotheses surface first.

A founder yes or no is appended to `evidence[]` as a new kind, `human-review`, `supports: true` or `false`, `provenance.asserted_by: "founder:gianyrox"`, tier T1 (`k = 2.0`, the top of the weight table), forcing an immediate recompute. Three consecutive founder "no" verdicts on hypotheses sharing a generator signature, same cluster, same `why` axis, lower that path's prior weight for future runs. G-8 still holds: a founder "yes" moves a hypothesis toward `sacred-history-corpus/correlations/` or `claims/`; the seam into `bucket-canon/` stays human-curated only.

## 8. Implementation Plan

Extend four existing files instead of duplicating their math:

- `_intake/sacred-history-corpus/tools/build-entity-graph.py`: factor lines 299-303 into an importable `edge_confidence(cos, fuz, motif_overlap)` function shared by the entity-graph builder and the hypothesis engine.
- `tools/canon-pipeline/scoring.py`: add a `to_tier(score) -> "T1".."T6"` export using the band mapping in §2.
- `src/lib/canon-claims.ts`: export a `patternSignalToConfidence(score)` helper (`min(1, score/10)`) usable by both the render path and the new engine.
- `PHOTON-SPEC.md`: add `truth_score` to the `hypothesis` kind's fields table, and add `period` as a new photon kind alongside `site` and `object`.

New modules, under `tools/hypothesis-engine/`:

- `truth_score.py`, the §2 model, the one place τ is computed.
- `generator.py`, the four generators and the combinatorial enumeration from §5.
- `tournament.py`, Elo seeding, critic, and ranking rounds.
- `evolver.py`, recombine, split, generalize.
- `holdout.py`, the §6 discovery-date and period holdout tests and the recalibration fit.
- `periods.py`, the OxCal-style phase model over `sacred-history.json`'s timeline array, from §4.

**Pulled from QAD v0.11:** a `retrieval.py` module persists every fetch the sacred-history mirror jobs make as an immutable envelope, linked to a `RetrievalRun` id, rather than letting a re-run overwrite what an earlier fetch found. Once a fetch routes through `x402-research-gateway` and parses as feed402, the envelope carries the gateway manifest fingerprint, protocol version, and citation/lineage counts the same way QAD's `feed402_envelope` table does (`GATEWAY_FIRST_V0.11.md`, `DATA_MODEL_V0.2.md`). Until that gateway path exists for history sources, `retrieval.py` still writes the envelope shape against the existing `sacred-history-runner.sh` fetch, so the provenance layer needs no rework when the gateway path lands.

Beads:

1. **bkt-hte-truth-score**: Implement the unified Bayesian truth-score module and wire systems A, B, C, and D into it as specified.
2. **bkt-hte-hypothesis-schema**: Add the hypothesis claim type and JSON shape to ENTITY-MODEL.md and PHOTON-SPEC.md, including the per-field `evidence_span` addition in §3.
3. **bkt-hte-period-model**: Add the period node type and the OxCal-style phase model over the existing timeline array.
4. **bkt-hte-generator**: Build the cluster, gap, contradiction, and cross-period-analogy hypothesis generators over the claims graph.
5. **bkt-hte-tournament**: Build the Elo-seeded ranking tournament and critic pass over generated hypotheses.
6. **bkt-hte-holdout**: Build the discovery-date and period holdout tests, run inside the `hte-campaign-001` frozen-work/strata campaign from §6, and calibrate the truth-score constants against it.
7. **bkt-hte-review-queue**: Wire founder yes and no review into the hypothesis evidence array and the generator's prior feedback.
8. **bkt-hte-ui**: Add a hypothesis browsing route mirroring canon-claims.ts's read pattern for the new hypothesis store.
9. **bkt-hte-retrieval-provenance**: Build `retrieval.py`, the immutable retrieval-envelope store and `RetrievalRun` linkage from this section.
10. **bkt-hte-evidence-span**: Add the `evidence_span` field to every `evidence[]` entry per §3.
11. **bkt-hte-extraction-ensemble**: Build the `ClaimExtractorEnsemble` and `HypothesisQualityReport` from §5.

## 9. Open Questions

1. Where do generated hypotheses live on disk: a sibling `hypotheses/` folder under `sacred-history-corpus`, or under `quantum/evidence`, given G-8 forbids `bucket-canon/` writes.
2. What field backs the discovery-date holdout split when a source's `captured_at` postdates its actual publication by years.
3. What posterior and cluster count justify canon promotion rather than a standing review-queue entry.
4. When Elo ranking and the recomputed posterior disagree after many tournament rounds, which one wins.
5. Who defines the calendar conversion for a hypothesis whose member traditions use incompatible calendars.
6. Does the weekly founder review budget scale with the size of the generated frontier, or stay fixed regardless of corpus growth.
