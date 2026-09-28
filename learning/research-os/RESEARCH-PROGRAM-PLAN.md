# Research Program Plan

Planning session, 2026-09-23, repository at `dev` 2a29127ba plus the untracked literature review and its notes. External facts were fetched 2026-09-23 with a URL; **UNVERIFIED** marks what a live page did not confirm. A passing review certifies readiness, never novelty, results or awards.

## Answer

Order: the prime frontier backtest, the LaBSE and colexification study, the hint-only tutor starting with a leak audit that needs no learners, then graph-attribution controls on the hypothesis engine. The randomized tutor trial needs money and a university partner, so it is the grant ask. The Tools Competition abstract, due 2026-10-13, is the one deadline inside 30 days. Ask a fiscal sponsor this week; Sloan and most foundations do not fund individuals.

## Starting Point

- **The graph is small and undated.** 510 composites, 41 primes, 731 minimal nonfaces, 22 candidate real gaps (`learning/research-os/PRIME-ALGEBRA.md`, runs of 2026-09-22 and 2026-09-23). Its edges carry the date Bucket added them, so any forecast test needs an outside dated corpus.
- **Primes lose to embeddings on retrieval.** Held out, prime attention scores nDCG@10 0.225 against 0.390 for embedding search with the same cone removed (M1). The algebra's value rests on counting and the frontier.
- **No human outcome data exists.** The tutor prompt says "prefer a guiding question or a hint" (`src/app/api/academy/tutor/route.ts`, line 141) and no code blocks a final answer. No IRB of record, faculty PI or partner school exists (`learning/research-os/study/IRB-PACKET-OUTLINE.md`, line 5). Polingual root labels come from two models at kappa 0.30 (`ROOTS-V2.md`).

## Study Selection

Four of the thirteen open problems were chosen, scored 1 to 5 on novelty (the review's claim discounted by prior art found in this pass), feasibility with data in hand, time to a first result, and product value.

| Study | Review problems | Novelty | Feasibility | Time to first result | Product value | Total |
|---|---|---:|---:|---:|---:|---:|
| S1 Prime frontier backtest | Minimal nonfaces; Dirichlet coverage | 3 | 4 | 4, about 6 weeks | 5 | 16 |
| S2 LaBSE against colexification | LaBSE and colexification | 4 | 5 | 5, about 4 weeks | 3 | 17 |
| S3 Hint-only tutor | Integrated FSRS, placement and tutor evaluation | 2 for the audit, 5 for the trial | 5 for the audit, 1 for the trial | 4 for the audit, 1 for the trial | 5 | 15 for the audit |
| S4 Graph attribution controls | Attributing a hypothesis to an edge | 2 | 4 | 3, about 8 weeks | 4 | 13 |

S2 scores highest and runs second, because S1 feeds the frontier page and builds most of the suite. Left out: gcd and lcm prime semantics, a design choice with no empirical test; evidence grading and the kappa benchmark, which need double human review beyond the founder's hours; SAE matching, threshold detection and micropayment behavior, which need model internals, learners or citation traffic Bucket lacks.

### Novelty Checks

| Group | Current home | Nearest work | Risk to Bucket's claims |
|---|---|---|---|
| Mario Krenn, Artificial Scientist Lab, Tübingen ([site](https://mariokrenn.wordpress.com/)) | W3 professor since June 2025 | Science4Cast pair forecasting, AUC to 0.93 ([arXiv:2210.00881](https://arxiv.org/abs/2210.00881)); Impact4Cast on 21M papers ([arXiv:2402.08640](https://arxiv.org/abs/2402.08640)) | High for S1 at the pair level |
| Tailin Wu, Westlake ([site](https://tailin.org/)) | Assistant professor, AI for Scientific Simulation and Discovery Lab | ZeroC concept composition; recent work is simulation | Low |
| Ziming Liu, Tsinghua ([site](https://kindxiaoming.github.io/)) | Assistant professor, College of AI | "Six Bets on Auto-Research", 2026-09-09 | Low, check S4 |
| CENSAI, Penn State | **UNVERIFIED**: no entity by that name was found. `PRIME-ALGEBRA.md` names Vasant Honavar, so write to him and ask for the center's name | Unknown | Unknown |

Add two more. Benson, Abebe, Schaub, Jadbabaie and Kleinberg predicted when an open triangle closes into a 3-simplex ([PNAS 2018](https://doi.org/10.1073/pnas.1800683115)), which is S1's triple nonface under another name. Johann-Mattis List's group maintains CLICS⁴, and "Partial Colexifications Improve Concept Embeddings" ([arXiv:2502.09743](https://arxiv.org/abs/2502.09743)) is nearest to S2.

## S1: Prime Frontier Backtest

**Hypothesis.** Minimal nonfaces, concept sets the literature never combined in one paper while combining every proper subset, ranked by surprise under a margin-preserving null, are combined within 3 to 5 years at a higher rate than degree-product, neighbourhood and Krenn-style rankings predict. H1 tests pairs; H2 tests triples, where pairwise forecasters have no native score. Secondary and descriptive: Dirichlet coverage(s) by year and field.

**The pair claim is small.** For pairs the M2 expected count is proportional to the degree product, preferential attachment, which Krenn's features include. Pairs add only the curveball null (Strona et al. 2014), which fixes each paper's concept count. Triples and the counterfactual classes carry any novelty.

**Data.** D1 is Science4Cast: 64,719 AI concepts with dated edges, [Zenodo 7882892](https://zenodo.org/records/7882892), CC BY 4.0; code at [FutureOfAIviaAI](https://github.com/artificial-scientist-lab/FutureOfAIviaAI), MIT. It covers pairs on Krenn's own splits. D2 is OpenAlex, one work per composite and its `topics` as vertices, which gives a dated hypergraph for triples. OpenAlex data is CC0 ([pricing and license](https://help.openalex.org/access/pricing/)), the snapshot at `s3://openalex` is free and quarterly ([snapshot](https://help.openalex.org/access/snapshot/)), and works carry `publication_date`, `topics` and `keywords` ([API](https://help.openalex.org/api/)). The snapshot avoids the $1 a day API budget. D3 maps Bucket's 22 candidate real gaps to OpenAlex topics and counts how many the literature already combines, which measures Bucket's own coverage gap.

**Method.** Cutoffs Y in {2012, 2015, 2018}, horizons h in {3, 5}. At each Y, keep topics with 20 or more works, compute pair and triple nonfaces as `frontier` does, and score each by independence count, curveball p-value at 1,000 draws, Benjamini-Hochberg class and a Swanson shared-neighbour term. A nonface is realized when m or more works in (Y, Y+h] hold the whole set, m in {1, 3}. The Python port is checked against `src/lib/research-os/prime-algebra.ts` on a frozen fixture.

**Evaluation.** Score the full candidate set; sampled negatives let a constant model score perfectly ([WWW 2021](https://dl.acm.org/doi/fullHtml/10.1145/3442381.3449856)). Metrics: AUC, average precision, precision@100 and @1,000, paired bootstrap over cutoffs. Baselines: random, degree product, common neighbours, Adamic-Adar, Jaccard, Krenn's released feature model on D1, and Benson's triple predictors. Controls: rerun every ranker on a curveball-scrambled table, where any ranker above random is exploiting margins; stratify within and across fields. Leakage: OpenAlex topics come from a classifier trained on today's corpus. Restrict each cutoff to topics with works before Y, rerun on `keywords`, and report the residual as a limitation.

**Triple baselines.** Each pairwise forecaster (degree product, common neighbours, Adamic-Adar, Jaccard, Krenn's model) scores a triple three ways over its three constituent pairs: the minimum, the geometric mean and the product. All three are fixed before the D2 run and reported side by side, beside Benson et al.'s own simplicial-closure predictors ([arXiv:1802.06916](https://arxiv.org/abs/1802.06916)), so "beats the baselines" means beats every aggregation.

**Smallest publishable result.** On D2 across three cutoffs, curveball-ranked triple nonfaces beat Benson's baselines on average precision with a bootstrap interval above zero, with coverage curves as a figure. A null on triples still publishes with the D1 pair benchmark.

**Venue.** arXiv, then ISSI 2027, full papers due 2027-01-15 ([ISSI 2027](https://issi2027.ntu.edu.tw/)). Fallback: Quantitative Science Studies, rolling (**UNVERIFIED**).

**Effort.** 5 agent-weeks, 10 founder hours: about 2 for the OpenAlex ETL and the TS to Python parity port, 2 for porting the Krenn and Benson baselines, 1 for analysis. If porting runs past week 7, drop one cutoff before cutting a baseline.

## S2: LaBSE Against Colexification

**Hypothesis.** Concept pairs that many language families colexify in CLICS⁴ sit closer in LaBSE space than pairs no family colexifies, measured only in languages that give the two concepts distinct forms. The effect is weaker for NSM semantic primes than for other core vocabulary.

**Data.** Polingual's `photons_full`, 6.5M rows with LaBSE vectors across 35 languages (`POLINGUAL-ROOTS.md`, line 22); CLICS⁴, 3,447 varieties, CC BY 4.0, [doi:10.5281/zenodo.16900179](https://doi.org/10.5281/zenodo.16900179), confirmed live in the review notes; Concepticon IDs as the join ([concepticon.clld.org](https://concepticon.clld.org/)). `scripts/research-os/clics_extract.py` and `nsm_exponents.py` exist.

**Method and evaluation.** For each Concepticon pair, average the LaBSE cosine between the two concepts' translations over the languages where the forms differ. Outcome: the count of families colexifying the pair. Mixed model with concept and family random effects; Spearman and AUC with bootstrap over concepts. Baselines: English fastText cosine, WordNet path similarity, and the partial-colexification embeddings of arXiv:2502.09743, which cover about 1,000 concepts. Controls: whole-family holdout, a degree-matched shuffled concept map, frequency matching, and strata by Polingual row confidence so root-extraction errors show.

**Smallest publishable result.** The held-out-family correlation with intervals over every Concepticon concept Polingual covers, and its gain over the English baseline.

**Venue.** ARR January 2027 cycle toward ACL 2027 ([ARR dates](https://aclrollingreview.org/dates)); the January date is **UNVERIFIED**. Alternative: SIGTYP 2027, whose 2026 deadline was 2026-01-09 ([SIGTYP](https://sigtyp.github.io/workshop.html)). The 2026-10-12 ARR cycle comes too soon.

**Effort and rights.** 3 agent-weeks, 6 founder hours. Wiktionary-derived word lists released with the paper carry CC BY-SA 4.0; aggregate statistics carry attribution to CLICS⁴ and Wiktionary.

## S3: Hint-Only Tutor

**Hypothesis.** Phase A: a code-level guard that blocks final answers cuts the answer-leak rate under adversarial prompts against today's prompt-only instruction, with no rise in false refusals on conceptual questions. Phase B: hint-only learners score at least as well on a no-AI exam as unrestricted-tutor and no-tutor learners, after Bastani et al. ([PNAS](https://www.pnas.org/doi/10.1073/pnas.2422633122)).

**Phase A method.** 358 atoms times four attack types (direct request, "check my answer", role-play, multi-turn extraction), 1,432 prompts, keys from `src/lib/academy/assess.ts`. Arms: today's prompt; a guard matching output against the key and worked solution; the guard plus a second-pass classifier. Metrics: leak rate by normalized match, false-refusal rate on a matched conceptual set, latency, with Wilson intervals. The founder labels a stratified 200 outputs to measure the automatic detector; model labels are excluded as ground truth, since two models agreed at kappa 0.30 on the roots sample.

**Smallest publishable result and venue.** The three-arm leak and refusal table with detector precision, at LAK27 posters and demos, due 2026-11-09 ([LAK27](https://www.solaresearch.org/events/lak/lak27/general-call/)).

**Phase B.** The three-arm trial in `learning/research-os/study/PREREGISTRATION-DRAFT.md` H1 needs an IRB of record, a faculty PI and a partner site, so it is the grant ask. Venue: Learning at Scale or AIED 2027, dates **UNVERIFIED**, or LAK28.

**Effort.** Phase A: 2 agent-weeks, 12 founder hours. Phase B: 6 agent-weeks after funding.

## S4: Graph Attribution Controls

**Hypothesis.** Given the gold-layer subgraph, the hypothesis engine or an LLM proposer forecasts held-out discoveries better than with a degree-preserving scramble that keeps labels, an equal-size random subset, a compact top-k subgraph, or no graph. If no graph matches the full graph, the graph earns no credit, after the Compressive KG paper ([arXiv:2605.27176](https://arxiv.org/abs/2605.27176)).

**Data.** HTE's discovery-date holdout over the quantum-history corpus and calibration pool (`tools/hypothesis-engine/docs/CALIBRATION-FIT-2026-09-10.md`); S1's D2 links realized after the proposer's training cutoff, the one event set a model cannot have memorized; SciPaths' 262 gold pathways ([arXiv:2605.14600](https://arxiv.org/abs/2605.14600)), an unreviewed preprint with license **UNVERIFIED**.

**Method and evaluation.** Five arms, same model, prompt and seed, plus counterfactual removal of each supporting edge. Metrics: Brier, hit@10, and each control's paired difference from the full arm with bootstrap intervals. Primary contrast: full against no graph on post-cutoff events; pre-cutoff events reported apart.

**Smallest publishable result and venue.** The five-arm table on post-cutoff links, publishable in either direction. An ICLR 2027 workshop, dates **UNVERIFIED** ([ICLR dates](https://iclr.cc/Conferences/2027/Dates)), or KDD 2027 cycle 2 in February, **UNVERIFIED** ([KDD 2027](https://kdd2027.kdd.org/research-track-call-for-papers/)).

**Effort.** 4 agent-weeks, 6 founder hours. Cached `hte/llm.py` calls, capped per run.

## Shared Evaluation Suite

**Location and branches.** `tools/research-eval/`, a Python package beside `tools/hypothesis-engine/` on the same `pyproject` pattern. Suite and measurement code: `measure/eval-*` branches into `ops/integration`. S4 engine arms: `feat/hte-graph-controls` into `hte/integration`. Any `/research-os/primes` page change: `feat/ros-*` into `dev`.

| Module | Holds |
|---|---|
| `datasets/` | Science4Cast, an OpenAlex snapshot slicer, a Bucket graph export, CLICS⁴ with Concepticon, an HTE holdout adapter. Each writes a manifest: source URL, license, snapshot date, SHA-256 |
| `splits/` | Temporal cutoffs with horizons, family holdouts, the 60/60 query split from `eval-attention.ts` |
| `metrics/` | AUC, average precision, precision@K, nDCG, Brier, calibration error, Wilson, paired bootstrap, Benjamini-Hochberg |
| `controls/` | Random, degree product, curveball null, degree-preserving scramble, random subset, no-graph |
| `runs/` | A YAML config per run, hashed before the held-out split is read; results JSON records config, dataset hashes and commit |

Bronze data stays untracked under `_intake/` per the medallion rule; manifests and results are tracked. Tests, run by `make test`: TS and Python parity on the frontier fixture, margin preservation in the curveball chain, metrics on toy data, and a constant model at 0.5 AUC over the full candidate set. Beads go in `BEADS-PENDING.jsonl`, one for the suite and one per study phase, each naming its results JSON and draft PDF as acceptance artifacts.

## Funding

Eligibility binds: Bucket is held in the founder's personal capacity (FD-8) and no sponsor has been contacted (`learning/research-os/funding/FISCAL-SPONSOR-DECISION.md`).

| Funder | Fit | Amount | Next deadline | Needs 501(c)(3) or sponsor | Funds |
|---|---|---|---|---|---|
| [Tools Competition](https://tools-competition.org/) | High; tracks include Postsecondary Learning (US) and Better Datasets | Catalyst $50K; Growth $150K; Transform $300K | Phase I abstract 2026-10-13; Phase II 2027-01-21 | **UNVERIFIED**: the page welcomes innovators, researchers, students and educators; confirm age and individual rules in the official rules before 2026-10-13 | S3; or Polingual as a dataset |
| [Sloan, Technology](https://sloan.org/programs/digital-technology) | High for the open graph and protocol | $50K to $250K per `grants-targets/bucket.md`, **UNVERIFIED** | Rolling 2-page letter of inquiry; replies within 8 weeks | No individuals; sponsor acceptance **UNVERIFIED** | S1 and the suite as open infrastructure |
| [Astera Residency](https://astera.org/residency/) | High; Open Science is a focus | $125K to $250K salary, $0 to $1.5M project | **UNVERIFIED** | No; individuals | The whole program, founder salary |
| [NSF PESOSE, NSF 26-506](https://www.nsf.gov/funding/opportunities/pesose-pathways-enable-secure-open-source-ecosystems/nsf26-506) | Medium, later; needs an existing user community | Track 1 up to $300K | 2027-03-02, then 2027-09-07 | Organization; text **UNVERIFIED** | Protocol and suite |
| [NSF CSSI](https://www.nsf.gov/funding/opportunities/cssi-cyberinfrastructure-sustained-scientific-innovation) | Medium; the real name of "CISSI" | **UNVERIFIED** | Awaiting a new solicitation | Organization | Suite as cyberinfrastructure |
| [Coefficient Giving](https://coefficientgiving.org/), formerly Open Philanthropy | Medium through its Abundance and Growth fund | **UNVERIFIED** | **UNVERIFIED** | **UNVERIFIED** | S1 as metascience |
| [Wikimedia Research Fund](https://meta.wikimedia.org/wiki/Grants:Programs/Wikimedia_Research_Fund) | Medium; M1 uses Wikipedia links | $2K to $150K | Next round likely January 2027, **UNVERIFIED** | No; established researchers | S2 |
| [Spencer small grants](https://www.spencer.org/grant_types/small-research-grant) | Medium | Up to $50K | **UNVERIFIED** | Doctorate PI and an administering organization | S3 phase B with a partner PI |
| [CZI EOSS](https://chanzuckerberg.com/eoss/) | Medium, later | n/a | Cycle 6 closed | Sponsored projects funded | Suite, once used by others |

Skipped for 90 days: other NSF education programs (DRK-12 archived, ITEST awaiting a solicitation; [NSF priorities](https://www.nsf.gov/updates-on-priorities)); [Schmidt Sciences](https://www.schmidtsciences.org/opportunities), which takes no unsolicited proposals; [Mozilla](https://www.mozillafoundation.org/en/what-we-fund/), no open call seen, **UNVERIFIED**; [FFDW](https://ffdweb.org/), partnerships only; Protocol Labs, unchecked.

**Drafts.** `grants-targets/drafts/sloan-exploratory-loi.md` (2026-05-04) pitches the payment protocol, names HCB as sponsor and writes to `digitaltechnology@sloan.org`; the live page gives `technology@sloan.org`. `FISCAL-SPONSOR-DECISION.md` quotes HCB limiting sponsorship to teen-led projects, so rewrite the letter around S1 and the suite with a new sponsor. `ef-esp-application.md` and `gitcoin-gg-round.md` fit the protocol and none of the studies. `WAVE-1-TARGETS.md` holds a Tools Competition lead paragraph.

**Sponsors.** [Code for Science and Society](https://www.codeforsociety.org/become-a-fiscally-sponsored-project) takes open data and research projects in cohorts, fee **UNVERIFIED**. Players Philanthropy Fund charges 6% (`FISCAL-SPONSOR-DECISION.md`). NumFOCUS is closed to new projects.

## 90-Day Sequence

From 2026-09-23 to 2026-12-22.

| Weeks | Work | Output |
|---|---|---|
| 1 to 3, to 2026-10-13 | Tools Competition abstract. Sponsor inquiries. Novelty emails to Krenn, Honavar, Wu, Liu and List. Suite skeleton and parity test on `measure/eval-suite`. Science4Cast and CLICS⁴ loaders | Abstract submitted; suite tests pass |
| 4 to 7, to 2026-11-10 | S1 on D1 against Krenn's splits; OpenAlex snapshot slice. S2 analysis end to end. S3 prompt set, guard and founder labels. Sloan letter once a sponsor answers | LAK27 poster by 2026-11-09; S2 results JSON |
| 8 to 10, to 2026-12-01 | S1 triples on D2 at three cutoffs, plus the scrambled controls and D3's check of the 22 gaps. S2 draft | S1 results JSON; S2 draft PDF |
| 11 to 13, to 2026-12-22 | S1 paper to arXiv under `papers/PAPER-STANDARDS.md`, with Lean for the coverage identity. S4 arms on `hte/integration`. Critic round on each paper | S1 preprint; S4 results; ISSI submission ready for 2027-01-15 |

Total: 14 agent-weeks; 34 founder hours on studies plus about 11 on the abstract, sponsor and Sloan letter. Phase B waits for money and a partner PI.

## Founder Decisions

1. **Fiscal sponsor now.** Yes: Code for Science and Society inquiry and Players Philanthropy Fund application this week, Form 1023 kept open. Sloan and NSF need an organization; the Tools Competition and Astera do not.
2. **Tools Competition tier.** Catalyst, $50K, for the hint-only tutor and its evaluation. Whether Polingual can also enter Building Better Datasets is **UNVERIFIED**.
3. **Code-level answer guard.** Ship it after the phase A baseline, so the audit measures the change.
4. **Founder hours.** Commit 45 over 13 weeks: 200 tutor labels, novelty emails in the founder's name, three draft reviews.
5. **Partner PI.** Start the search in November; phase B has no IRB of record or Spencer eligibility without one.

## Limitations

CENSAI's identity, several venue dates, SciPaths' license and most grant amounts are **UNVERIFIED**. OpenAlex topics carry hindsight. All 41 primes sit inside single branches, which D3 will test. No study here measures learning; phase A measures tutor behavior.
