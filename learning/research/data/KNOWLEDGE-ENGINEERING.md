# Bucket Academy — The Science of the Knowledge Layer

**Bead:** bkt-xo0 · **Pillar:** Data · **Author:** Data pillar lead (Nucleus) · 2026-06-11
**Scope:** the algorithmic substrate that makes Bucket Academy *correct and amazing* — spaced
repetition scheduling, the nucleus computation, paper→atom extraction, mastery modelling, and
analytics. Pilot domain: biophysics general-exam prep.

> Founder mandate: **NOT fast — correct and amazing.** This document picks the *right* algorithm
> for each layer, with primary citations, and says exactly how we wire it. Where the literature is
> ambiguous, we say so and give a default plus a kill-criterion.

This is a research + decision document. It maps 1:1 onto the data layout in
`KNOWLEDGE-ARCHITECTURE.md` (`decks/` = FSRS state, `engine/` = scheduler/quiz/tutor,
`atoms/NN-branch/*.md` = Concept Atoms, `syllabus/NN-branch.md` = the nucleus map).

---

## 0. The five layers and their chosen algorithms (executive map)

| Layer | Question it answers | Chosen method | Why this one |
|---|---|---|---|
| **1. Scheduler** | When do I review atom X? | **FSRS-6** (DSR memory model), target retention **0.90** (exam-sprint: 0.95) | ML-fit per-user forgetting curve; benchmarked best; open-source (MIT); supersedes SM-2 |
| **2. Nucleus** | Which atoms ARE the high-leverage core? | **Leverage score** = personalized PageRank on the *unlocks* graph, gated by topological order + k-core, blended with reachable-frontier count | Captures "how much downstream depends on this" the way PageRank captures fundamentality in course-prereq networks |
| **3. Extraction** | How do papers become atoms? | **Anchor-constrained, provenance-tracked LLM extraction** → schema-validated → citation-grounded eval → human-in-the-loop on canon-tier | Every triple must trace to source text; hallucination is the dominant failure mode |
| **4. Mastery** | How well does this user know atom X? | **BKT per atom** (interpretable, 4 params) as the production spine; **IRT** for question calibration; **DKT optional** as a cross-skill re-ranker only | Interpretability is a hard requirement for a study UI that explains *why*; BKT↔IRT have a proven formal link |
| **5. Analytics** | Forgetting curves, heatmap, exam-readiness | Derived directly from FSRS state (R(t)) + BKT mastery + graph coverage | All three upstream models already emit the quantities we need; no new model |

The rest of the document derives each row.

---

## 1. Spaced repetition: SM-2 → Anki → FSRS

### 1.1 Why spacing + active recall at all (the evidence floor)

Two interventions dominate the learning-science evidence base, and Bucket is built on both:

- **The spacing effect** — distributing study over time beats massing it. Cepeda et al. (2006)
  meta-analysis: spacing boosts retention ~10–30%.
- **The testing effect / retrieval practice** — recalling beats re-reading. Roediger & Karpicke
  (2006): retrieval can improve recall ~50% vs. restudy.

Robert Bjork's **desirable difficulties** framework explains *why* a scheduler should aim for a
review point where recall is effortful but still likely: he distinguishes **storage strength**
(how deeply encoded) from **retrieval strength** (how accessible now). A review done when
retrieval strength has *decayed* but storage strength is intact produces the largest gain in
storage strength. This is the cognitive justification for a *target retention below 100%* — you
deliberately wait until recall is non-trivial. ([Bjork, desirable difficulties](https://www.structural-learning.com/post/desirable-difficulties); [retrieval-practice + spacing review, PMC4480221](https://pmc.ncbi.nlm.nih.gov/articles/PMC4480221/))

**Design consequence:** our scheduler must (a) space reviews, (b) drive *active recall* (not
re-reading), and (c) place the review in the desirable-difficulty zone — which is exactly what a
target-retention scheduler does. This rules out "read the atom again tomorrow" loops.

### 1.2 The lineage

**SM-2 (SuperMemo 2, Piotr Woźniak, 1987).** The original algorithm shipping in Anki for years.
Per card it tracks an *ease factor* (EF, starts 2.5), an interval, and a repetition count. On a
good answer the interval multiplies by EF; EF is nudged up/down by the grade (Again/Hard/Good/Easy);
a lapse resets the interval. Strengths: tiny, deterministic, no training. Weaknesses: EF is a crude
single number, intervals are *not* tied to any explicit recall-probability target, it can't learn
*your* forgetting rate, and "ease hell" (EF spiraling down) is a known failure. SM-2 has no concept
of *retrievability* — it cannot answer "what is the probability I recall this right now?"

**Anki's scheduler.** Anki historically wrapped SM-2 with learning steps, lapse handling, fuzz, and
leech detection. Good engineering, same theoretical ceiling: a heuristic interval multiplier, not a
fitted memory model. As of Anki 23.10+, **FSRS ships built-in** and is the recommended scheduler.

**FSRS (Free Spaced Repetition Scheduler).** A machine-learning scheduler built on Woźniak's
**DSR memory model** and MaiMemo's **DHP** variant. The foundational result is Ye, Su & Cao,
*A Stochastic Shortest Path Algorithm for Optimizing Spaced Repetition Scheduling*, **KDD '22**
(SSP-MMC), fit on 220M review logs from the MaiMemo app, +12.6% over prior schedulers; this became
the FSRS4anki plugin and then Anki core.
([Ye, Su, Cao KDD'22, ACM DL](https://dl.acm.org/doi/10.1145/3534678.3539081);
[SSP-MMC code](https://github.com/maimemo/SSP-MMC);
[FSRS repo, MIT](https://github.com/open-spaced-repetition/free-spaced-repetition-scheduler);
[FSRS4anki wiki — ABC of FSRS](https://github.com/open-spaced-repetition/fsrs4anki/wiki/ABC-of-FSRS);
[Expertium — technical explanation](https://expertium.github.io/Algorithm.html))

### 1.3 The FSRS memory model (DSR), made precise

FSRS models each card's memory by three quantities; FSRS-6 has **21 parameters** w₀…w₂₀.

**Retrievability R** — probability you recall the card *right now*, t days after the last review,
given stability S. FSRS uses a **power forgetting curve** (a single exponential under-fits because a
population of memories with different stabilities decays as a *superposition* of exponentials, which
is well-approximated by a power law):

```
R(t, S) = (1 + FACTOR · t/S)^(−DECAY)
FSRS-5:  FACTOR = 19/81,  DECAY = 0.5         → R(S,S) = 0.9 exactly
FSRS-6:  DECAY = w20 (trainable, ~0.1–0.8),  FACTOR = 0.9^(−1/w20) − 1
```

By construction **R = 0.9 when t = S**: *stability S is, by definition, the number of days until
retrievability falls to 90%.* ([forgetting-curve power-law rationale, Expertium](https://expertium.github.io/Algorithm.html); [awesome-fsrs — The Algorithm](https://github.com/open-spaced-repetition/awesome-fsrs/wiki/The-Algorithm))

**Stability S** — memory strength in days (the time for R to drop to 90%). Larger S = flatter
forgetting curve = longer safe interval.

**Difficulty D** — intrinsic hardness of the item, D ∈ [1,10]; higher D means stability grows more
slowly per review.

**Initial state** (after the *first* rating G ∈ {Again=1, Hard=2, Good=3, Easy=4}):
```
S0(G) = w_{G−1}                              (so w0..w3 are the four initial stabilities)
D0(G) = w4 − exp(w5·(G−1)) + 1               (clamped to [1,10])
```

**Difficulty update** (linear damping + mean reversion toward the easy-anchor, which kills "ease hell"):
```
ΔD(G) = −w6 · (G − 3)
D'    = D + ΔD · (10 − D)/9                  (linear damping: harder to move D near the edges)
D''   = w7 · D0(4) + (1 − w7) · D'           (mean reversion to the "Easy" anchor)
```

**Stability after a successful recall** — grows by a factor SInc ≥ 1 that *increases* when D is low,
when prior S is low, and when R at review time is low (the three "memory laws": complex material →
smaller gain; already-stable → smaller gain; reviewed when nearly forgotten → larger gain):
```
S' = S · ( e^{w8} · (11 − D) · S^{−w9} · (e^{w10·(1−R)} − 1) · HARD · EASY + 1 )
HARD = w15 (<1, applied on a Hard answer),  EASY = w16 (>1, applied on Easy)
```
(FSRS-6 reparameterizes the same shape with w17/w18/w19 governing learning-rate, gradient-shift,
and stability-dependent decay.)

**Stability after a lapse (Again)** — a separate, smaller "post-lapse stability," capped so it can
never exceed the pre-lapse S:
```
S'_fail = min( S,  w11 · D^{−w12} · ((S+1)^{w13} − 1) · e^{w14·(1−R)} )
```

**Interval from target retention.** Invert the forgetting curve: schedule the next review at the t
where R hits the desired retention R_d:
```
I(R_d, S) = (S / FACTOR) · ( R_d^{(−1/DECAY)} − 1 )
```
At R_d = 0.90, I = S (the interval equals stability — the cleanest statement of the whole system).
Lower R_d → longer intervals/fewer reviews but more forgetting; higher R_d → shorter intervals/more
reviews. ([interval formula, awesome-fsrs](https://github.com/open-spaced-repetition/awesome-fsrs/wiki/The-Algorithm); [Expertium](https://expertium.github.io/Algorithm.html))

### 1.4 How parameters are optimized per user

FSRS fits the 21 weights to a user's own review history by **maximum likelihood**: each review is a
Bernoulli trial (recalled / not) with success probability R predicted from the running (D,S,R) state;
training is **back-propagation through time** over each card's review sequence, with **recency
weighting** so newer reviews count more. Cold start: ship sensible **default weights** (the
benchmark-fit population defaults) and re-optimize once the user has ~1k reviews (Anki's practical
threshold). FSRS-rs (the Rust trainer) is the reference implementation. ([DSR training: BPTT + MLE](https://studycardsai.com/blog/anki-fsrs-algorithm); [Expertium — benchmark/optimization](https://expertium.github.io/Benchmark.html))

### 1.5 Where FSRS sits vs. alternatives

- **Duolingo's Half-Life Regression** (Settles & Meeder, ACL 2016) is the other production-grade
  trainable model: it estimates a word's memory **half-life** h via regularized regression on
  lag-time + history features, R = 2^(−Δ/h); cut recall-prediction error ~45% vs. Leitner and lifted
  Duolingo retention ~9.5%. It's elegant and the dataset/code are open, but it's tuned for a
  *massive-population, low-feature, language-vocab* regime and models a single half-life rather than
  the D/S/R decomposition we want for analytics. ([Settles & Meeder ACL'16 PDF](https://research.duolingo.com/papers/settles.acl16.pdf); [code](https://github.com/duolingo/halflife-regression))
- **FSRS wins for us** because (a) it's benchmarked best across public datasets, (b) it exposes
  S and R explicitly, which we reuse for the forgetting-curve and exam-readiness analytics, and
  (c) it's MIT-licensed with mature reference implementations (Python `fsrs`, `fsrs-rs`, TS ports).

### 1.6 RECOMMENDATION — how Bucket schedules reviews

1. **Adopt FSRS-6** as the scheduler. Store per-atom-per-user state `{D, S, last_review, R_now}` in
   `decks/<user>/<atom-id>.json` (the `decks/` slot already reserved in the architecture).
2. **Target retention = 0.90** as the default desirable-difficulty zone (90% is the documented sweet
   spot balancing review load vs. forgetting). ([target-retention guidance](https://github.com/open-spaced-repetition/fsrs4anki/blob/main/docs/tutorial.md))
3. **Exam-sprint mode = 0.95** in the N weeks before a scheduled exam date (Pro "Exam-Simulator"),
   trading more reviews for higher recall. Drop back to 0.90 after.
4. **Mastery-signal gating (the Bucket twist).** A Concept Atom carries `mastery_signal ∈
   {recall, apply, derive, teach}`. We run **one FSRS deck per (atom, signal level)** the atom
   requires. "Recall" cards graduate fast; "derive" cards are harder, so FSRS naturally assigns them
   higher D and shorter intervals — exactly right. An atom is *mastered* only when all its required
   signal-level decks are stable past a threshold (see §4).
5. **Cold start:** ship population-default weights; trigger per-user re-optimization at ≥1,000
   reviews, then nightly thereafter (cheap; runs in the Nucleus background job).
6. **Anti-pattern guard:** never show the answer before requiring an active-recall attempt; FSRS
   grades are meaningless without genuine retrieval. The four ratings map to our quiz grader:
   Again = wrong, Hard = correct-but-slow/partial, Good = correct, Easy = correct-and-instant.

---

## 2. The nucleus computation (the differentiator)

This is what Anki and Duolingo cannot do. Given the Concept-Atom dependency graph, **compute which
atoms ARE the load-bearing nucleus, and emit an optimal learning path.**

### 2.1 The graph object

From the atom front-matter (`requires`, `unlocks`) we build a directed graph **G = (V, E)**:
- **V** = Concept Atoms.
- **`unlocks` edge** A → B means "mastering A unlocks/enables B." This is the **leverage** direction
  (downstream-dependency flow).
- **`requires` edge** is the inverse (B requires A). The two are duals; we store both for traversal.
- The graph **should be acyclic** within a branch (a DAG). Cross-branch **bridge** edges
  (stat-mech↔information↔ML) are allowed and may create cross-branch cycles → handle by **condensing
  strongly-connected components** (Tarjan) into super-nodes before topological ops, so a cycle
  becomes one "co-requisite cluster" you learn together.

This is structurally the same object studied in **course-prerequisite networks**, where centrality
measures have validated meaning. ([Course-Prerequisite Networks, Applied Network Science 2023](https://link.springer.com/article/10.1007/s41109-023-00543-w); [arXiv 2210.01269](https://arxiv.org/pdf/2210.01269))

### 2.2 Candidate centrality measures and what each means here

| Measure | In our graph it means… | Use it for |
|---|---|---|
| **Out-degree** (on `unlocks`) | # of atoms that *directly* depend on this one | A first, cheap "fan-out" signal |
| **Reachable-set size** (transitive closure on `unlocks`) | total # of downstream atoms this *eventually* unlocks | The purest "leverage" number — how much of the field collapses if you know this |
| **PageRank** (on `requires`-direction, i.e. importance flows to prerequisites) | "fundamentality" — an atom is important if important atoms depend on it; recursively | The headline nucleus ranking (validated meaning in course-prereq nets: PageRank surfaces the truly foundational, introductory nodes) |
| **Betweenness** | atoms that lie on many prerequisite paths — *bottlenecks/bridges* | Find the gatekeeper concepts; cross-branch bridges score high |
| **k-core** (core decomposition) | the maximal subgraph where every node has ≥k neighbors | Isolate the dense interdependent "core" of a branch vs. peripheral leaves |
| **In-degree** (on `unlocks`) | how many prerequisites an atom has | A *difficulty/readiness* signal, not a leverage signal |

Why PageRank specifically: in course-prerequisite networks, "the importance of a course depends not
only on how many courses use it as a prerequisite, but also on how important those post-requisites
are — implemented by PageRank, which measures how fundamental a course is and favors the more
introductory nodes." That is *exactly* the nucleus definition in `KNOWLEDGE-ARCHITECTURE.md`.
([Course-Prerequisite Networks](https://link.springer.com/article/10.1007/s41109-023-00543-w);
[Centrality, Wikipedia](https://en.wikipedia.org/wiki/Centrality))

### 2.3 Knowledge-Space Theory: the rigorous frame for *ordering*

Centrality ranks *importance*; **Knowledge Space Theory (KST)** (Doignon & Falmagne, 1985) gives the
rigorous theory of *valid learning orders and assessment*. Core objects we adopt:

- **Surmise relation** ≤ : q ≤ q′ means mastering q′ implies you've mastered prerequisite q. This is
  *precisely* our `requires` edge. KST proves a knowledge structure is a **quasi-order** of items.
- **Knowledge state** K: the set of atoms a learner can currently do. Valid states are closed under
  prerequisites (you can't have B without its required A).
- **Fringe** of a state K: the atoms q ∉ K such that K ∪ {q} is still a valid state — i.e. the
  *exactly learnable-next* set (prereqs satisfied, not yet mastered). The **outer fringe = the study
  frontier.** This is the formal definition of "what am I ready to learn now."
- **Learning path** = a maximal chain of states from ∅ to the full domain, adding one fringe item at
  a time — a topological walk, with KST guaranteeing each step is *valid*.

KST also gives adaptive-assessment theory (the fringe has maximal diagnostic value) that we reuse in
§4. ([Knowledge Spaces, Doignon–Falmagne; Knowledge & Learning Spaces, arXiv 1511.06757](https://arxiv.org/abs/1511.06757);
[CRAN `kst` package — formal definitions](https://cran.r-project.org/web/packages/kst/vignettes/kst.pdf);
[Competence-based Knowledge Structures](https://www.researchgate.net/publication/32231311_Competence-based_Knowledge_Structures_for_Personalised_Learning))

### 2.4 RECOMMENDATION — the nucleus algorithm

We combine *importance* (centrality) with *valid ordering* (KST). Concretely:

**Step A — Build & sanitize the graph.**
Load atoms, build G on `unlocks`/`requires`. Tarjan-condense SCCs (cross-branch cycles → co-req
clusters). Assert acyclicity of the condensation; topologically sort it.

**Step B — Compute the Leverage Score per atom** (the nucleus ranking):
```
leverage(v) = α · PR(v) + β · norm(reach(v)) + γ · norm(betweenness(v)) + δ · kcore(v)
```
- `PR(v)` = PageRank on the `requires`-direction graph (importance flows to prerequisites),
  damping 0.85. **This is the dominant term.**
- `reach(v)` = size of the transitive `unlocks`-closure of v, normalized by |V| — "fraction of the
  branch this single atom unlocks downstream."
- `betweenness(v)` = bridge/bottleneck signal (surfaces cross-branch polymath connectors).
- `kcore(v)` = coreness, to upweight the dense interdependent core over peripheral leaves.
- **Default weights: α=0.45, β=0.30, γ=0.15, δ=0.10.** These are a *prior*, not a contract — tune
  against a held-out "which atoms did exam questions actually require" signal once we have one (the
  kill-criterion: if leverage ranking doesn't correlate with exam-question frequency, re-weight).

The **nucleus shell of a branch = the top atoms by leverage** that the syllabus tags `[N]`. The
score is what decides *which* of the candidate atoms get promoted into the curated nucleus and in
what priority — it operationalizes "smallest set of load-bearing ideas that unlock the most."

**Step C — Generate the optimal learning path** (leverage-weighted topological order):
A plain topological sort has many valid linearizations; we pick the *best* one with a greedy
priority walk over the KST fringe:
```
path = []
state = atoms already mastered (∅ for a new learner)
while frontier = fringe(state) is non-empty:
    pick v* = argmax over frontier of  leverage(v) · readiness(v) · depth_discount(v)
    append v* to path; state = state ∪ {v*}
```
- `readiness(v)` = 1 if all `requires` are mastered (fringe guarantees this), else 0 — i.e. we only
  ever choose from the valid fringe (KST validity).
- `depth_discount` mildly prefers shallower atoms first so prerequisites land before their dependents
  even among equally high-leverage options.
This yields a path that is **valid (never teaches B before A) AND greedy-optimal for leverage**
(front-loads the concepts that unlock the most). It is the data behind Duolingo's "skill tree," but
computed from real dependencies instead of hand-authored.

**Step D — Polymath bridges.** Atoms with high *betweenness* that span two `branch:` values are
tagged as **bridges** and surfaced specially (the "polymath flex" in PRODUCT.md §5). They are where
cross-branch transfer happens; the path generator schedules a bridge once *both* its sides'
prerequisites are mastered.

**Implementation:** `networkx` (PageRank, betweenness, k-core, condensation, topo-sort are all
stdlib-level there) in `engine/nucleus.py`; emits `syllabus/NN-branch.leverage.json` + a per-user
`path.json`. Recompute on atom-graph change (nightly Nucleus job) and on each mastery update (cheap —
only the fringe changes).

---

## 3. Paper → Concept Atom extraction

Turn corpus docs (arXiv, PMC OA, LibreTexts, OpenStax, NCBI Bookshelf — all open/legal per the
syllabus sourcing note) into Concept Atoms with `requires`/`unlocks` edges, an equation, sources, and
quiz prompts. **The dominant failure mode is hallucination** — a plausible-but-wrong equation or a
fabricated prerequisite edge. The pipeline is built around *grounding every field in source text*.

### 3.1 The literature signal

- **Anchor-constrained, provenance-tracked extraction** is the current best practice: every extracted
  triple must be *anchored to a span of the source text*, and provenance is stored so faithfulness is
  verifiable. "The lack of provenance — the ability to trace each piece back to its textual origin —
  makes it fundamentally impossible to verify extraction faithfulness." ([Grounded KG Extraction via LLMs — anchor-constrained + provenance, MDPI Computers 2026](https://www.mdpi.com/2073-431X/15/3/178))
- **Two-stage extract-then-verify** (GraphEval pattern): extract atomic claims as a subgraph, then
  check each triple's *entailment against the source context*; drop or flag un-entailed triples.
  ([Knowledge Graphs, LLMs, and Hallucinations — NLP perspective, arXiv 2411.14258](https://arxiv.org/html/2411.14258v1))
- **Concept-prerequisite inference** is its own research line — prerequisite edges between concepts
  can be inferred from educational resources, which we use as a *second, independent* signal to
  cross-check LLM-proposed `requires` edges. ([Inferring Concept Prerequisite Relations, arXiv 1811.12640](https://arxiv.org/pdf/1811.12640))
- **Ontology/schema grounding** measurably reduces hallucination — constraining extraction to a
  fixed schema and a fixed branch vocabulary beats free-form. Our Concept-Atom YAML schema *is* that
  ontology. ([ontology-grounded KGs reduce hallucination](https://www.sciencedirect.com/science/article/abs/pii/S1532046426000171))

### 3.2 RECOMMENDATION — the extraction pipeline (`engine/extract/`)

A staged pipeline, each stage gated, nothing reaches canon-tier without grounding:

1. **Ingest & chunk.** Pull OA doc (already-live `arxiv/`, `pubmed/`, etc. ingest). Section-aware
   chunking; keep char offsets for provenance anchors.
2. **Candidate-concept proposal.** LLM proposes candidate atoms per chunk *constrained to the branch
   syllabus vocabulary* (`syllabus/05-biophysics.md` topic list). Schema-constrained decoding to the
   Concept-Atom YAML — `id`, `title`, `type`, `equation`, `requires`, `unlocks`, `sources`.
3. **Anchor every field.** For each field, the model must return the **source span** (chunk id + char
   range) that justifies it. No anchor → field is dropped. Equations must be anchored to a literal
   equation in the source (the highest-risk field).
4. **Schema + symbolic validation.** YAML validates against the Concept-Atom schema. Equations are
   parsed with `sympy`; reject if unparseable; where the source gives units/limits, sanity-check
   dimensionally. (We are not *verifying* physics — we are verifying the extracted equation matches
   the anchored source text and is well-formed.)
5. **Edge cross-check.** Each LLM-proposed `requires` edge is cross-checked against (a) the
   independent concept-prerequisite inferer and (b) the existing branch graph (does the prereq atom
   exist / is it plausibly upstream?). Disagreements are flagged, not auto-accepted.
6. **Entailment verification (extract-then-verify).** A *separate* LLM/NLI pass checks each
   atom field entails from its anchor span. Un-entailed → quarantine.
7. **Quiz generation.** Generate R/A/D/T prompts; the **derive** prompt must be answerable from the
   atom's equation + prerequisites (closes the loop on correctness — if the model can't generate a
   valid derivation question, the atom is probably under-specified).
8. **Human-in-the-loop on canon-tier.** Two acceptance lanes:
   - **Frontier/community atoms:** auto-publish if stages 3–6 pass, labeled "AI-extracted,
     unreviewed," and *cannot* enter the nucleus shell.
   - **Nucleus/canon atoms:** require a human expert tap (the founder, for biophysics pilot).
     Route through the existing **Longtail chisel queue** (`scripts/submit-to-longtail.mjs`,
     already wired in this repo) for fast yes/no/unsure on quality axes — reuse, don't rebuild.

### 3.3 How we know an atom is correct (the eval)

| Failure mode | Detector | Gate |
|---|---|---|
| Hallucinated equation | sympy parse + anchor-to-source-equation check | hard-block |
| Wrong/fabricated prereq edge | independent prereq-inferer disagreement + graph existence check | flag → human |
| Field not supported by source | NLI entailment vs. anchor span | quarantine |
| Concept too broad/narrow/synonymous | dedup against existing atom embeddings (cosine > 0.9 → merge candidate) | flag |
| Quiz answer wrong | self-consistency: generate answer 3× + check against atom; derive-prompt must close | regenerate |
| Citation integrity (canon) | every `sources:` entry resolves to a real OA doc id | hard-block |

**Metrics tracked** (Nucleus brain-feed): per-batch **anchor-coverage rate** (fields with valid
anchors / total), **entailment pass-rate**, **edge-agreement rate** with the independent inferer,
and **human-acceptance rate** on the sampled canon lane. A batch with anchor-coverage < 0.95 or
entailment pass-rate < 0.90 is held for review rather than published. ([anchor/provenance + entailment basis](https://www.mdpi.com/2073-431X/15/3/178); [arXiv 2411.14258](https://arxiv.org/html/2411.14258v1))

---

## 4. Mastery model & "what to study next" recommender

### 4.1 The candidate models

- **BKT — Bayesian Knowledge Tracing** (Corbett & Anderson 1994). A 2-state Hidden Markov Model per
  skill with **4 interpretable parameters**: P(L₀) prior mastery, P(T) learn-transition, P(G) guess,
  P(S) slip. After each attempt, posterior P(mastered) is updated by Bayes. *Interpretable, tiny,
  battle-tested* (pyBKT). Crucially, BKT has a **proven formal link to IRT**: the stationary
  distribution of the BKT Markov process yields the logistic IRT item-characteristic curve — so BKT
  and IRT are two views of the same logistic structure. ([BKT overview](https://www.emergentmind.com/topics/bayesian-knowledge-tracing-bkt); [pyBKT intro](https://www.researchgate.net/publication/372537251_An_Introduction_to_Bayesian_Knowledge_Tracing_with_pyBKT); [BKT↔IRT link](https://www.emergentmind.com/topics/bayesian-knowledge-tracing))
- **IRT — Item Response Theory.** Models P(correct) = logistic(ability θ − item difficulty b
  [+ discrimination a, guessing c]). Best-in-class for *calibrating question difficulty* and
  estimating a stable *ability* per learner. Bayesian IRT extensions have been shown to *outperform
  neural nets* for proficiency estimation. ([Back to the Basics — Bayesian IRT > NN, arXiv 1604.02336](https://arxiv.org/pdf/1604.02336))
- **DKT — Deep Knowledge Tracing** (LSTM). +up to ~25% AUC over classic BKT on benchmarks by
  implicitly capturing recency, cross-skill transfer, and ability variation — **but it is not
  interpretable**, which is a deal-breaker for a UI whose whole pitch is showing you *why* and *what
  unlocks what*. ([DKT gains + interpretability cost](https://arxiv.org/pdf/2105.06266); [explainable-KT survey, arXiv 2403.07279](https://arxiv.org/pdf/2403.07279))

### 4.2 RECOMMENDATION — a layered mastery model

**Interpretability is a hard product requirement** (PRODUCT.md: "you always know *why* you're
learning this and *what it unlocks*"; analytics surface a mastery heatmap). So:

1. **BKT per (atom, mastery-signal) is the production spine.** One BKT instance per atom×signal
   tracks P(mastered). Item observations come from the quiz grader. P(mastered) ≥ **0.95** (the
   standard BKT mastery threshold) marks that signal level done; an atom is **mastered** when all its
   required signal levels clear *and* its FSRS stability exceeds a floor (so "mastered" means
   *retained*, not just *once-correct* — this fuses §1 and §4, which Anki and ITS systems keep
   separate and we deliberately unify).
2. **IRT calibrates the question bank.** Fit per-question difficulty b (and discrimination a) from
   aggregate response data; feed b into FSRS's auto-difficulty (PRODUCT.md "Auto-difficulty") so the
   quiz always sits in the desirable-difficulty zone, and into BKT's guess/slip priors. A new
   AI-generated question starts at a prior difficulty from its mastery-signal (recall<apply<derive<teach)
   and is recalibrated as responses accrue.
3. **DKT is optional and contained** — only ever as a *re-ranker* that nudges study order using
   cross-skill transfer signal, never as the source of the displayed mastery number. Ship without it;
   add only if BKT-driven recommendations measurably under-serve. (Kill-criterion in reverse: DKT
   earns its place only with an A/B win on retention.)

### 4.3 The "what to study next" recommender (`engine/recommend.py`)

Each session blends **three demand sources**, scored and merged:

```
score(atom) =  w_due  · due_pressure(atom)        # FSRS: how overdue / how low R_now is
            +  w_front · frontier_value(atom)      # KST fringe × leverage (§2): high-leverage & ready
            +  w_weak  · weakness(atom)            # BKT: low P(mastered) on an already-started atom
            −  w_load  · cognitive_load_penalty    # avoid stacking too many brand-new atoms in one session
```
- **due_pressure** = atoms whose FSRS R_now has fallen below target retention — *these come first*
  (forgetting an already-learned atom wastes prior effort; spacing science says protect it).
- **frontier_value** = for atoms on the KST outer fringe (prereqs satisfied, not started),
  `leverage(atom)` from §2 — pick the highest-leverage *ready* new concept (front-load the nucleus).
- **weakness** = atoms with low BKT P(mastered) that are started but not solid — targeted remediation
  (this is the PRODUCT.md "Gaps → Nucleus brain" loop).
- **Default mix:** a session is ~60% due-reviews, ~25% frontier (new nucleus), ~15% weak-spot drill;
  exam-sprint mode reweights toward weak-spots + due. Tunable per learner.

This is the concrete realization of PRODUCT.md §3's "FSRS surfaces today's due reviews + the next
nucleus concept on your path" — now with a principled scoring function.

---

## 5. Analytics (all derived, no new models)

Everything below is a *read* off the three upstream models — no additional ML.

### 5.1 Forgetting curves (per atom, per user)
Plot R(t, S) = (1 + FACTOR·t/S)^(−DECAY) from each atom's current FSRS state — the literal forgetting
curve, with the next-review marker at R = target retention. This is the Pro-tier "forgetting curves"
feature, and it's free to render because FSRS already tracks S. Aggregate across a branch → a
"branch retention" curve.

### 5.2 Mastery heatmap
Grid of atoms (rows = nucleus shell order, columns = branches), cell color = BKT P(mastered) × FSRS
retention. Greens = retained+mastered, yellows = mastered-but-decaying (a *review* is due), reds =
not-yet/weak (a *learn/drill* is due). This is the "mastery heatmap" and it directly drives the
recommender's weak-spot term. The shell structure (prereq→nucleus→frontier) makes the heatmap read
as a *progress front* sweeping across the dependency graph.

### 5.3 Projected exam-readiness date
Define **exam-ready** = a target fraction (e.g. 90%) of the syllabus `[N]` nucleus atoms at
P(mastered) ≥ 0.95 *and* FSRS stability ≥ floor *by the exam date*. Project forward by simulating the
study plan: given the user's daily atom-acquisition velocity (atoms moved to mastered/week, measured)
and the FSRS review load that backlog implies, estimate the date the nucleus front reaches the
threshold. Report **readiness % today**, **projected ready-date**, and **gap = atoms-remaining /
velocity**. Velocity is a simple measured rate; the projection is a deterministic roll-forward of the
FSRS + BKT state, not a forecast model. This is the Pro "projected exam-readiness date."

### 5.4 The gap-report (the feedback loop)
After each session (and the Exam-Simulator), emit a **gap-report**: the weakest atoms (low BKT, low
FSRS R), the *un-mastered prerequisites blocking high-leverage frontier atoms* (the highest-ROI
fixes — unblock a high-leverage atom and you unlock its whole reachable set), and any atoms decaying
toward forgetting. This report is **fed back to the Nucleus brain** (`/api/feed`, signal_type
`discovery`/`gap`) so the next session's recommender pre-loads the weak set — closing the
PRODUCT.md §3 loop ("Gaps → Nucleus brain → tomorrow targets them").

### 5.5 Brain-feed metrics (for the Data pillar dashboard)
Per learner: atoms-mastered, nucleus-coverage %, mean stability, review-load/day, projected
ready-date. Per branch (content health): atom count, mean leverage of nucleus, extraction
anchor-coverage & entailment pass-rate, human-acceptance rate. These feed the org brain so content
gaps and learner gaps are both visible.

---

## 6. Build order (maps to PRODUCT.md phases)

- **P0 (now, days):** `engine/fsrs.py` (FSRS-6, default weights, target 0.90) + `engine/nucleus.py`
  (leverage score + path gen on the biophysics atom graph) + a terminal quiz loop with a BKT
  mastery counter. Proves scheduler + nucleus + mastery on ~40 biophysics atoms.
- **P1:** `engine/extract/` pipeline (stages 1–7) feeding new atoms; `engine/recommend.py` blended
  scorer; the heatmap + forgetting-curve renders.
- **P2:** IRT question calibration; exam-readiness projection; exam-simulator; per-user FSRS
  re-optimization job; gap-report → brain-feed.
- **P3:** optional DKT re-ranker (only on an A/B retention win); cross-branch bridge surfacing.

---

## 7. Open questions / honest gaps

1. **FSRS at "derive/teach" granularity is untested** — FSRS is validated on recall-style cards.
   Treating derive/teach as separate decks is principled but novel; watch whether their grades are
   noisy enough to destabilize the fit. Mitigation: start derive/teach as *coarser* grades
   (correct/incorrect) and only split if data supports it.
2. **Leverage-score weights (α,β,γ,δ) are a prior**, not fit — we need a held-out "exam questions
   actually required these atoms" signal to validate the nucleus ranking. Until then, treat the
   ranking as a strong heuristic, human-reviewed for the pilot.
3. **Cold-start everywhere** — FSRS needs ~1k reviews, IRT needs response volume, BKT priors are
   guessed. For a single-learner pilot (Gian's exam prep) we run on population defaults and accept
   wider confidence intervals; the models sharpen as data accrues.
4. **Extraction at canon-tier is human-gated by design** — this is a feature (correctness > speed
   per the mandate), but it makes nucleus-atom throughput bounded by reviewer time. The Longtail
   chisel queue is the throughput valve.

---

## 8. Cross-pillar dependencies

- **Engineering** — owns `engine/` implementation (Python P0 → service in P1), the Next.js surfaces
  (skill tree, heatmap, forgetting-curve charts), and Stripe billing **routed through Viatika** per
  org policy (AI-generation metering on Pro: tutor, card-gen, art).
- **Product** — owns the desirable-difficulty UX, the four-signal mastery ladder semantics, tier
  gating (free = nucleus paths + FSRS; Pro = exam-sim + analytics + PDF import), and the
  gamification guardrail (streak must not eat understanding).
- **People** — owns the LLM-extraction *eval rubric* and the human-in-the-loop reviewer workflow
  (the canon-tier acceptance lane through the Longtail chisel queue).
- **Operations** — owns AI-generation cost modelling (FSRS keeps review-volume predictable, which
  bounds tutor/art spend) and the legal posture (open-corpus-only ingest; user-supplied PDFs for
  copyrighted texts per ACQUISITION-LEDGER.md).
- **Revenue** — owns Pro pricing ($8–12/mo) validation against the analytics+exam-sim feature set.
- **Bucket IP rail** — Scholar-tier authored atoms mint to Story Protocol; the extraction schema's
  provenance anchors double as the citation graph for citation-fee routing.

---

## 9. Primary sources

**Spaced repetition / FSRS**
- Ye, Su, Cao. *A Stochastic Shortest Path Algorithm for Optimizing Spaced Repetition Scheduling.* KDD '22. https://dl.acm.org/doi/10.1145/3534678.3539081 · code: https://github.com/maimemo/SSP-MMC
- FSRS (MIT) — https://github.com/open-spaced-repetition/free-spaced-repetition-scheduler
- FSRS4anki wiki, ABC of FSRS — https://github.com/open-spaced-repetition/fsrs4anki/wiki/ABC-of-FSRS · The Algorithm — https://github.com/open-spaced-repetition/awesome-fsrs/wiki/The-Algorithm · tutorial/target-retention — https://github.com/open-spaced-repetition/fsrs4anki/blob/main/docs/tutorial.md
- Expertium, *A technical explanation of FSRS* — https://expertium.github.io/Algorithm.html · *Benchmark* — https://expertium.github.io/Benchmark.html
- Settles & Meeder. *A Trainable Spaced Repetition Model for Language Learning (Half-Life Regression).* ACL 2016. https://research.duolingo.com/papers/settles.acl16.pdf · code: https://github.com/duolingo/halflife-regression

**Learning science**
- Bjork, desirable difficulties — https://www.structural-learning.com/post/desirable-difficulties
- Retrieval practice + spacing review — https://pmc.ncbi.nlm.nih.gov/articles/PMC4480221/

**Nucleus / graph / knowledge spaces**
- *Course-Prerequisite Networks for Analyzing and Understanding Academic Curricula.* Applied Network Science 2023 — https://link.springer.com/article/10.1007/s41109-023-00543-w · arXiv 2210.01269 — https://arxiv.org/pdf/2210.01269
- Centrality (PageRank, betweenness, k-core) — https://en.wikipedia.org/wiki/Centrality
- Doignon & Falmagne, Knowledge/Learning Spaces — https://arxiv.org/abs/1511.06757 · `kst` R package formal defs — https://cran.r-project.org/web/packages/kst/vignettes/kst.pdf · competence-based structures — https://www.researchgate.net/publication/32231311_Competence-based_Knowledge_Structures_for_Personalised_Learning

**Extraction**
- *Grounded KG Extraction via LLMs — anchor-constrained + provenance.* MDPI Computers 2026 — https://www.mdpi.com/2073-431X/15/3/178
- *Knowledge Graphs, LLMs, and Hallucinations* — https://arxiv.org/html/2411.14258v1
- *Inferring Concept Prerequisite Relations from Online Educational Resources* — https://arxiv.org/pdf/1811.12640
- Ontology-grounded KGs reduce hallucination — https://www.sciencedirect.com/science/article/abs/pii/S1532046426000171

**Mastery / knowledge tracing**
- BKT overview & BKT↔IRT link — https://www.emergentmind.com/topics/bayesian-knowledge-tracing-bkt · https://www.emergentmind.com/topics/bayesian-knowledge-tracing
- pyBKT intro — https://www.researchgate.net/publication/372537251_An_Introduction_to_Bayesian_Knowledge_Tracing_with_pyBKT
- *Back to the Basics: Bayesian IRT outperforms NN for proficiency estimation* — https://arxiv.org/pdf/1604.02336
- DKT / LANA — https://arxiv.org/pdf/2105.06266 · Explainable-KT survey — https://arxiv.org/pdf/2403.07279
