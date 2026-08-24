# Adaptive Learning

State of the Art.

**Epic:** bkt-jh0 · **Pillar:** Data · **Author:** Data pillar lead (Nucleus) · 2026-06-14
**Builds on:** `learning/research/data/KNOWLEDGE-ENGINEERING.md` (the algorithmic substrate) and
`learning/research/_synthesis/DECISIONS.md` (founder-accepted decisions). Read those first; this
document goes *deeper* on the five things that decide whether the learning system is
strong, and revises three earlier choices where the production literature is clearer than the
seed research was.

> Founder mandate (unchanged): **NOT fast, correct and amazing.** Every recommendation below picks
> the *right* mechanism with a primary citation, says how we wire it, and gives a kill-criterion.

The single most useful discovery of this pass: two production systems have already solved most of
this in public and we should copy them deliberately, **ALEKS** (the only peer-reviewed description
Of a production Knowledge-Space-Theory engine: Cosyn, Uzun, Doble & Matayoshi 2021,
[JMP2021 preprint](https://jmatayoshi.github.io/publications/JMP2021_KST_ALEKS_preprint.pdf)) and
**Math Academy** (Skycak's published essays on their knowledge graph + "Fractional Implicit
Repetition"). Where DECISIONS.md described a model from first principles, these give us a *validated*
blueprint, with numbers.

---

## 0. Executive map

What's new vs. KNOWLEDGE-ENGINEERING.md.

| Layer | Prior decision (DECISIONS.md) | What this doc adds / changes | Confidence |
|---|---|---|---|
| **(a) Curriculum + diagnostic** | Reach-Score nucleus + KST fringe; no diagnostic spec'd | **ADD the ALEKS binary-search-over-states diagnostic** (place a learner in ~25 questions, plateaus by Q10 on 2.7M real assessments). **ADD Math Academy's two-layer graph** (prerequisite edges + separately-weighted *encompassing* edges). | High, both validated in production |
| **(b) Mastery / credential** | BKT per (atom,signal) fused w/ FSRS stability, P≥0.95 | **REPLACE BKT-as-spine with an IRT/Elo measurement spine**; keep a tracing model only as predictor. **ADD a conjunctive, CI-lower-bound, retention-gated credential formula** + the reliability/validity evidence a credential legally needs. | High on the stack; the fusion formula is our synthesis |
| **(c) Assessment + anti-gaming** | IRT calibrates questions; not much on gaming | **ADD the full anti-gaming stack** (effort-moderated IRT, gaming + wheel-spinning + copy detectors, exposure control) and the **practice/credential firewall** that makes the score un-farmable. | High, each detector is a cited, deployed method |
| **(d) Trustworthy AI content** | Anchor-constrained extraction + human canon (S1, S7) | **ADD the generation+grounding+verification eval stack** (RAGAS thresholds, SAFE-vs-canon, a 4-tier provenance model) so *generated lessons*, not just extracted atoms, are trustworthy. | High, composes cited methods |
| **(e) Map computation/viz** | Reach Score; react-force-graph; concentric shells | **CORRECT the PageRank orientation bug**, **ADD Borda rank-aggregation**, **ADD topological stratification + Sugiyama layout** as the hairball fix, and the library/scale matrix. | High, directly from course-prerequisite-network papers |

The three **revisions** (mastery spine → IRT/Elo; add a real diagnostic; add the two-layer graph)
are the load-bearing changes. The rest deepens decisions already made.

---

## The knowledge-graph curriculum + the diagnostic

KNOWLEDGE-ENGINEERING.md §2 already nailed the *nucleus* (Reach Score) and the *ordering* (KST
fringe walk). Two things were missing, and both come straight from production systems.

### a.1 Make the graph two-layered

Math Academy's ~2,500-topic graph (4th grade → university) carries **two** edge types, and conflating
them is a mistake we should avoid
([justinmath.com/how-math-academy-creates-its-knowledge-graph](https://www.justinmath.com/how-math-academy-creates-its-knowledge-graph/)):

1. **Prerequisite edges**, "you must know A before B." This is our existing `requires`/`unlocks`
 DAG and the KST surmise relation. ~5 prerequisite edges per topic on their graph.
2. **Encompassing edges (NEW for us)**, a *separately weighted* edge A→B meaning "doing a problem
 in B implicitly exercises fraction *w* of skill A." The weight ≈ "the probability that a random
 problem from the advanced topic encompasses a random problem from the simpler topic"
 ([justinmath.com/individualized-spaced-repetition...](https://www.justinmath.com/individualized-spaced-repetition-in-hierarchical-knowledge-structures/)).

Why this matters: the encompassing layer is what lets review **propagate** (see a.4 / the FIRe
mechanism) and is the difference between "flashcards on a graph" and a real mastery engine.

**Build cost is real and bounded.** Skycak hand-estimated encompassing weights for ~1,500 topics ×
~5 prereqs × ~2 min ≈ **250 expert-hours**, one expert, one month. Experts set explicit weights
*only on nontrivial direct edges*; the full topic-to-topic matrix is then **inferred by propagation**,
Not hand-filled. And: *"a graph does not have to be fully encompassed for its efficiency to
approach the theoretical limit"*, **modest encompassing density already captures most of the
benefit** ([justinmath.com/individualized-spaced-repetition...](https://www.justinmath.com/individualized-spaced-repetition-in-hierarchical-knowledge-structures/)).
For our biophysics pilot (~40-400 atoms) this is hours of work.

**Recommendation:** add an optional `encompasses:` block to the Concept-Atom front-matter, a list of
`{atom_id, weight∈(0,1]}` on the *prerequisite* atoms a given atom exercises when solved. Default the
matrix to propagated values; let the human reviewer set explicit weights only where they're nontrivial.

### a.2 Validate edges against learner data

Not just expert intuition.

Three sourcing strategies for the prerequisite graph, in increasing automation:
- **Expert-handcrafted** (Math Academy, ALEKS), highest quality, the right default for the canon
 nucleus; iteratively refined by splitting/merging "chunks" against real performance.
- **Inferred from data**, the **PREREQ** method (Roy et al. 2019) represents each concept as a
 topic-distribution vector via *Pairwise-Link LDA* (captures directionality), then a Siamese net
 classifies ordered pairs; F ≈ 0.60 on University-Course / MOOC datasets, degrading only marginally
 to 40% training data ([arXiv 1811.12640](https://arxiv.org/pdf/1811.12640)). This is our *second,
 independent* check on LLM-proposed `requires` edges (already in KNOWLEDGE-ENGINEERING.md §3.1).
- **Hybrid (recommended for scale):** ML-rank candidate pairs → surface only high-scoring pairs to a
 human → build incrementally (active learning), bounding expert effort.

**The validation that makes the graph *real* (copy this from ALEKS):** treat the knowledge structure
As a probabilistic classifier of "does this learner know atom q," and check it against **held-out**
Responses with **AUROC / accuracy / point-biserial**, plus a **calibration check**: atoms the model
marks *in-state* should be answered ~0.8 of the time, *out-of-state* ~0.1, and *boundary*
Atoms near **0.5**. ALEKS reports College-Placement **AUROC 0.889, accuracy 0.814, point-biserial
0.671** on a held-out "extra problem" over 3.1M assessments; their boundary bucket lands at 0.43-0.45
≈ the desired 0.5 ([JMP2021 §2.2, Tables 2-3](https://jmatayoshi.github.io/publications/JMP2021_KST_ALEKS_preprint.pdf)).
**If our boundary bucket isn't near 0.5, the graph is miscalibrated.** This is also the missing
Validator for the Reach-Score weights (the DECISIONS.md open question #1): once we have a question
bank, the same held-out signal tells us whether reach ranking predicts exam-question frequency.

### a.3 The diagnostic: binary-search over knowledge states

DECISIONS.md spec'd no diagnostic. ALEKS's is the most validated public design and we should copy it
nearly verbatim ([JMP2021 §1.3](https://jmatayoshi.github.io/publications/JMP2021_KST_ALEKS_preprint.pdf)):

**The algorithm.** Maintain a **probability distribution over feasible knowledge states**. Each
Question, pick the atom whose containing-states' probabilities sum to **≈ 0.5**, the item that
**halves the distribution** (entropy-optimal, a binary search over states). Bayesian-update after each
Answer (correct → raise states containing it; incorrect → lower them; continue until one state
Dominates).

**Why it's tractable** despite ~10²³ feasible states in a real course (vs 2³¹⁴ subsets, KST's
Prerequisite closure is what collapses the space): you **can't enumerate** 10²³ states, so ALEKS
**partitions atoms into subsets, runs the assessment in parallel on each** (each subset's projected
sub-structure is small enough to list), and **carries each answer's information across subsets**.

**Efficiency (the headline numbers).** A perfect halving over 2⁷⁷ states would need 77 questions;
ALEKS caps at **~30** (29 adaptive + 1 held-out) because of a documented *fatigue effect*. And it
barely needs them: across **2.69M assessments, AUROC/accuracy/point-biserial plateau by ~question 10**
"the assessment obtains a fairly accurate picture, then fine-tunes." So we can place a
learner among an astronomical number of states in **~10-25 questions**.

**Slip/guess handling (cheap, high-ROI, copy all three):**
1. **Open-ended answer entry** (no multiple choice) keeps lucky-guess probability tiny, so a *correct*
 answer can be updated **aggressively**.
2. An explicit **"I haven't learned this yet" button** supplies clean negative evidence and
 *measurably reduces* the number of questions needed.
3. **Asymmetric Bayesian update weights** tied to per-item guess/slip rates: roughly **35 for
 correct, 5 for incorrect, 50 for "don't know"** (Falmagne & Doignon 2011, Remark 13.4.5, as
 reported in [JMP2021 §1.3](https://jmatayoshi.github.io/publications/JMP2021_KST_ALEKS_preprint.pdf)).
4. A **correct-but-too-slow** answer gets diminished weight (timing is first-class, same as Math
 Academy, [mathacademy.com/how-our-ai-works](https://www.mathacademy.com/how-our-ai-works)).

Math Academy's diagnostic is the same idea phrased differently: estimate the learner's **knowledge
frontier** (the boundary between known/unknown), reaching *below* the course level to find gaps,
Via "an algorithm that compresses the knowledge graph and repeatedly selects questions that provide
maximum information gain", observed in practice as ~34 MCQs producing a per-section gap map
([mathacademy.com/how-our-ai-works](https://www.mathacademy.com/how-our-ai-works);
[notes.andymatuschak.org/Math_Academy](https://notes.andymatuschak.org/Math_Academy)).

**Recommendation:** implement the ALEKS state-search diagnostic in `engine/diagnostic.py`. For the
Small pilot graph the full state space is enumerable (no parallel-subset trick needed yet); add
subset-partitioning when a branch exceeds ~a few thousand atoms. Use open-ended entry + the
"haven't learned" button + the 35/5/50 weights. Cap at ~25 questions, with an early-stop when the
posterior over states concentrates. Uncertain atoms (likelihood driven to neither 0 nor 1) are
*excluded* from the final state (so we underestimate) and then **fast-tracked in learning mode** with
A lower mastery target, the underestimate self-corrects.

### a.4 What-to-learn-next = the outer fringe

Refilled after every mastered atom.

Both systems converge here and it matches KNOWLEDGE-ENGINEERING.md §2: a learnable atom is one whose
prerequisites are all met, **KST's outer fringe** / Math Academy's **"Layering"** (advance the
instant prereqs clear, never hold back). In a *learning space* a state is fully determined by its
inner + outer fringes, so the fringe is cheap to recompute after each mastered atom
([JMP2021 §1.1-1.2](https://jmatayoshi.github.io/publications/JMP2021_KST_ALEKS_preprint.pdf)). The
*which* fringe item to pick is decided by the Reach Score (front-load the nucleus), tie-broken to
**prioritize dissimilar concepts** (minimize associative interference) and to **maximize review
Compression**, both Math Academy moves ([mathacademy.com/how-our-ai-works](https://www.mathacademy.com/how-our-ai-works)).

---

## The mastery model

Fusing proficiency + retention into a credential-grade score.

This is where I'm **revising DECISIONS.md #11**. The seed put **BKT** as the production spine. After
the deeper pass, BKT should be demoted: it's interpretable but it's a coarse 2-state HMM, and the
*defensible measurement* literature (and the credentialing requirement, which is new emphasis from
This epic) points to **IRT as the score of record, with Elo as its online estimator**. A neural
tracer is a *predictor*, never the certified number.

### b.1 The proficiency stack

1. **Elo with an uncertainty function = online IRT (the live estimator, solves cold-start).** Treat
 each attempt as a match: `P(correct) = σ(θ_learner − b_item)`, *exactly the 1PL/Rasch model*.
 Update both sides by the prediction error:
   ```
   θ := θ + K·(correct − P)
   b := b + K·(P − correct)
   ```
 Pelánek shows Elo is **single-pass SGD on the same log-likelihood IRT maximizes**, so it
 *is* online IRT ([Pelánek 2016, Computers & Education](https://www.fi.muni.cz/~xpelanek/publications/CAE-elo.pdf)).
 Replace constant `K` with an **uncertainty function** `U(n)=a/(1+b·n)` (a=1, b=0.05) so new
 learners/items move fast and auto-stabilize, **no batch calibration needed before an item is
 usable.** Use *separate* schedules for items vs learners (items get more data, stabilize faster).
 For MCQs use the guessing-floor form `P = 1/k + (1−1/k)·σ(θ−b)`.
2. **IRT (2PL; 3PL for MC) = the calibrated, certified snapshot (the score of record).** Once an item
 has ~**200-250 responses**, fit difficulty `b` + discrimination `a` (+ guessing `c`) by **MMLE**
 (EM, integrate θ out) or Bayesian MCMC for the ill-conditioned 3PL; estimate each learner's θ by
 **EAP/MAP** with a posterior SE ([de Ayala, *Theory & Practice of IRT*](https://www.cms.guilford.com/books/The-Theory-and-Practice-of-Item-Response-Theory/R-de-Ayala/9781462547753/contents);
 [Columbia IRT primer](https://www.publichealth.columbia.edu/research/population-health-methods/item-response-theory)).
 IRT is the spine because all the reliability/standard-setting machinery a credential needs assumes
 an IRT-style measurement model.
3. **AKT (Rasch-embedded attentive KT) = the predictor / item-selector. The certified number comes from elsewhere.**
 Context-Aware Attentive KT (Ghosh et al., KDD 2020) bakes a Rasch difficulty into its embeddings
 (`x = c_concept + μ_q·d_concept`), giving the best of both: transformer prediction power tethered
 to interpretable difficulty. It wins where it matters (+~6% AUC on the harder ASSISTments2015/2017)
 while plain transformers (SAKT/SAINT) buy little on smaller real assessments, in the AKT benchmark
 **DKT (0.817) beats SAKT (0.752) on ASSISTments2009**
 ([AKT, arXiv 2007.12324](https://arxiv.org/abs/2007.12324) / [PDF](https://people.umass.edu/~andrewlan/papers/20kdd-akt.pdf)).
 Use AKT only for adaptive next-item selection and mastery-trajectory modeling; ship without it and
 add only on an A/B win (same kill-criterion the seed applied to DKT).

The elegance: **Elo, IRT, and AKT's embeddings all share the Rasch core** `σ(θ−b)`, they reconcile
To one latent θ scale. Elo is the online estimator, IRT the calibrated snapshot, AKT the predictor.
BKT survives only as an optional interpretable per-atom mastery *display* if product wants it, never
as the credential.

### b.2 Retention is a *different* signal

Keep FSRS, and use R explicitly.

FSRS owns the **time** dimension: stability `S`, difficulty `D`, and **retrievability `R(t,S)`** =
probability of recall *right now*, t days after last review (KNOWLEDGE-ENGINEERING.md §1 has the full
DSR derivation). The credential-relevant fact: **proficiency answers "can they do it?"; retention
answers "will they still do it in T days?"** A learner can have high θ today (just crammed) and low
stability (`R` collapses in a week). **A credential that ignores `R(t)` certifies cramming.** That is
the entire reason to fuse.

### b.3 The fusion formula

Per knowledge component (atom×signal) `k`, two signals on [0,1]:

- **Proficiency** `P_k = σ(a_k·(θ_k − b*_k))`, evaluated at the **minimal-competency difficulty** `b*`
 (set by the Angoff panel below), and computed at the **lower bound of the θ confidence interval**,
 `θ_k − z·SE(θ_k)`, so we certify what we are *confident* they know, discounting a lucky point estimate.
- **Retention** `R_k = R(T, S_k)`, FSRS retrievability evaluated at a fixed **credential horizon**
 `T` (e.g. 90 days). A freshly-crammed atom with low stability scores low here even if θ is high.

**Fuse multiplicatively (geometric / Cobb-Douglas), never additively**, a credential needs *both*
"can do it" AND "kept it," and a weighted sum lets one compensate for a zero in the other:

```
M_k = P_k^α · R_k^β          (α,β > 0; start α=β=1 = geometric mean; M_k→0 if either →0)
```

In log space this is a weighted sum of log-probabilities = the joint log-likelihood of "correct now
AND still retrievable at horizon T." **Aggregate to the credential conjunctively**, well clear of averaging
(averaging lets someone pass while failing a required competency):

```
Overall  M = ( Π_{k∈required}  M_k^{w_k} )^{1/Σ w_k}        (weighted geometric mean)

CERTIFY  iff   ∀ k∈required:  M_k ≥ c_k        (per-KC Angoff cut, on CI-lower-bound θ)
          AND  M ≥ C                           (overall cut)
          AND  evidence sufficiency: Elo U(n) below threshold  (don't certify on thin data)
```

The per-KC conjunctive gate is what makes this a *competency* credential rather than a points total.
This **fuses §1 (FSRS) and §4 (mastery) into one number**, the unification the seed flagged as the
Bucket twist, now with a defensible algebra and a credential horizon.

### b.4 What a credential legally needs

A score "backing a credential" is a high-stakes classification governed by the **AERA/APA/NCME
Standards**. To make `M` defensible (Kane's argument-based validity), we must assemble and **publish**
([test-validity primer, PMC4803101](https://pmc.ncbi.nlm.nih.gov/articles/PMC4803101/);
[Kane, argument-based validation](https://methods.sagepub.com/book/mono/preview/argument-based-validation-in-testing-and-assessment.pdf)):

1. **Calibration evidence**, IRT item parameters with item-fit; items discriminate, model fits.
2. **Internal-consistency reliability**, **Cronbach's α ≥ 0.80 (ideally ≥ 0.90)** for high-stakes
 ([Cronbach's alpha](https://en.wikipedia.org/wiki/Cronbach's_alpha)); plus marginal reliability
 from the IRT information function.
3. **Classification consistency at the cut**, P(two forms agree on pass/fail).
4. **Test, retest *at the retention horizon***, re-test a sample at T days; the credential must hold.
 **This is where FSRS-`R` earns its place**, it operationalizes "did they keep it."
5. **Documented standard-setting**, a **modified-Angoff** panel sets every `c_k` and `C` (SMEs
 estimate P(minimally-competent learner correct) per item); report inter-rater ~0.80 + panel
 test, retest ([standard-setting reliability, PMC1578558](https://www.ncbi.nlm.nih.gov/pmc/articles/PMC1578558/);
 [Angoff reproducibility, PMC12522590](https://www.ncbi.nlm.nih.gov/pmc/articles/PMC12522590/)).
6. **The five Standards validity sources**, content alignment, response processes (are they reasoning
 not gaming, §c), internal structure, **relations to external criteria** (does passing predict real
 performance, the most persuasive evidence), and **consequences** (no false passes, no adverse
 impact).
7. **A written Kane validity argument** chaining scoring → generalization → extrapolation → decision,
 with the retention component explicitly defended as the warrant for *durable* mastery.

For the Bucket "Scholar"/credential ambition this is the moat: most adaptive products ship an *ad-hoc
weighted-sum* "mastery %" with none of this. A conjunctive, retention-gated, Angoff-calibrated,
α-reported score is what lets a Bucket credential mean something.

---

## Assessment generation + anti-gaming

Two coupled problems: generate items that test *understanding* (not recall), and make the resulting
score *un-farmable*. They must be designed together, a score is only as un-farmable as its weakest
item-and-grader.

### c.1 Generating valid items

- **Hybrid AIG:** template/item-model AIG for the *derivation skeleton* (validity-by-construction) +
 LLM for *novel scenario wrappers and distractors* (same skill, new context = **transfer by
 construction**). A 2025 review of 71 AIG studies stresses human oversight remains essential for
 validity ([Tandfonline review](https://www.tandfonline.com/doi/full/10.1080/10494820.2025.2482588)).
- **Force higher-order cognition.** LLMs hit Remember/Understand and degrade at
 Apply/Analyze/Create, exactly the levels we care about. Two moves measurably help: inject the
 explicit Bloom-level definitions into the prompt, and add chain-of-thought about cognitive demand
 *before* writing the stem ([arXiv 2408.04394](https://arxiv.org/pdf/2408.04394)). Best
 controllability comes from generating *from the knowledge graph* so the item must combine ≥2 atoms
 (multi-hop), **KAQG** (KG-enhanced RAG + difficulty-control layer,
 [arXiv 2505.07618](https://arxiv.org/pdf/2505.07618)). This is why our atom graph + `requires` edges
 are an *asset* for generation: derive questions that span a prerequisite chain.
- **Prefer derivation/symbolic answers.** A computed/derived answer is a transfer item by
 construction (the exact instance was never seen) *and* is deterministically gradeable (c.2). Design
 items toward symbolic answers wherever the domain allows.
- **Distractors from student-error models instead of free generation.** "LookAlike"/student-choice methods
 generate distractors matching *actual* conceptual errors → plausible by construction; the failure
 mode is execution-consistency (the LLM names a feasible error but miscomputes the matching value)
 ([LookAlike, arXiv 2505.01903](https://arxiv.org/pdf/2505.01903)). Human reviewers judged only ~53%
 of LLM distractors high-quality, a screening gate is mandatory.
- **The empirical gate most platforms skip:** field every item in *practice* first, collect
 ≥200-250 responses, compute IRT difficulty + discrimination (via Elo→IRT, b.1), **retire
 low-discrimination items**, and only promote survivors to the credential pool. The 2025
 large-scale AI-generated-exam field study is the credible template (generate → human review → live
 IRT) ([arXiv 2508.08314](https://arxiv.org/pdf/2508.08314)).

### c.2 Auto-grading

- **Math/symbolic/numeric → deterministic SymPy equivalence** (parse → subtract → `simplify` →
 `== 0`, with a 5-second timeout; any parse error/timeout = not-equivalent). This is **un-foolable**
 and catches deep equalities (√2·√8 = 4; sin²+cos² = 1) that string-match misses
 ([PrairieLearn pl-symbolic-input](https://docs.prairielearn.com/elements/pl-symbolic-input/)).
 *Maximize the fraction of items that reduce to a symbolic answer* precisely because grading is then
 deterministic.
- **Free text → rubric-decomposed LLM grading** (AutoSCORE-style component scoring), with a
 self-refined rubric, **ensemble across ≥2 model families**, and **confidence-gated human deferral**
 ([AutoSCORE, arXiv 2509.21910](https://arxiv.org/html/2509.21910v1); rubric self-refinement raised
 QWK +0.19-0.47, [arXiv 2510.09030](https://arxiv.org/html/2510.09030)). Calibrate to **QWK ≥ the
 human, human ceiling (~0.7-0.8)** on a held-out human-graded set before trusting it for credit.
- **LLM graders are actively foolable, never let one be the sole high-stakes gate.** Persuasive
 fluent-wrong answers inflate scores ~8% ([arXiv 2508.07805](https://arxiv.org/pdf/2508.07805));
 "GradingAttack" fools short-answer graders via keyword stuffing, fluent fabrication, false
 authority ([arXiv 2602.00979](https://arxiv.org/pdf/2602.00979)). Defenses: deterministic grading
 where possible; ensemble + follow-up probing; and **continuous adversarial canaries** (seed known
 fluent-wrong / keyword-stuffed responses; if the grader passes any, alert and re-tune).

### c.3 The anti-gaming stack

Layered detectors (each a cited, deployed method) + design rules:

| Attack | Counter | Source |
|---|---|---|
| **Rapid guessing** | **NT10** response-time threshold (10% of item's mean time, capped 10s) → **Effort-Moderated IRT** drops rapid-guess responses from the ability estimate, so guessing cannot raise the score | [NT thresholds](https://link.springer.com/article/10.1186/s40536-021-00100-w); [Effort-Moderated IRT](https://www.researchgate.net/publication/229985871) |
| **Gaming the system** (guess-and-check, help abuse) | Baker-style ML detector on guess-and-check streaks, help-timing, answer-sequence regularity; gamed sessions don't count toward the credential | [Baker et al.](https://link.springer.com/chapter/10.1007/11774303_38) |
| **Wheel-spinning** (grinding without mastering) | Flag ≥10 opportunities without 3-in-a-row correct; a grind is *not* mastery → route to remediation, don't award credit. This is the guard against **false-positive mastery** | [Beck & Gong](https://www.semanticscholar.org/paper/0890bd77b4615cbe9aa6be27b4c9aa6772f3d74f) |
| **Repeat / memorize an item** | Large pool + **parameterized AIG clones** (same skill, new surface) + **Sympson-Hetter exposure control** (no item over-served or harvestable) | [Sympson-Hetter](https://assess.com/sympson-hetter-item-exposure-control/) |
| **Look up / share answers** | Parameterized symbolic items (the looked-up answer is for a *different* instance) + deterministic SymPy grading + response+time-similarity copy detection | c.1/c.2 |
| **Game spaced repetition** (always press "easy") | **Self-reported SR difficulty affects scheduling ONLY, never credit.** Credit comes from objective checkpoint performance | design rule |

**The structural guarantee, the practice/credential firewall.** Separate two loops:
- **Practice**, spaced repetition, self-report grading, LLM grading, unlimited retries, hints.
 Every farming strategy above attacks *this* loop, and that's fine.
- **Credential**, a **sealed, held-out checkpoint of freshly AIG-generated transfer items the
 learner has never seen**, graded deterministically where possible, **effort-filtered**,
 **exposure-controlled**, and **time-decaying** (mastery expires and must be re-demonstrated on a new
 item set, defeating one-time luck or a leak).

Routing the score through the sealed checkpoint makes every farming strategy pay off only in *practice
points that don't convert to mastery*. This is the single most important architectural decision in §c.

---

## Trustworthy AI content generation

KNOWLEDGE-ENGINEERING.md §3 covered *extraction* (paper→atom). This adds the *generation* path
(write a lesson/problem for any topic) and the eval that keeps it trustworthy vs. the human canon.

**The premise:** RLHF/instruction-tuning systematically destroys calibration, instruction-tuned
Models are *confidently wrong* because reward models favor definitive answers
([arXiv 2410.09724](https://arxiv.org/abs/2410.09724)). **Trust must never come from the generator's
confidence; only from grounding + external verification + a human signature.**

### d.1 Generation + grounding architecture

```
topic →
  hybrid retrieval (BM25 + dense) over TRUSTED CANON ONLY
  → RRF fusion (k=60) → cross-encoder re-rank top-k
  → grounding gate: if top-chunk similarity < τ → ABSTAIN (queue for human authoring, never guess)
  → generate with MANDATORY inline citations to canon chunk IDs
  → tool-call out for anything deterministic (arithmetic, units, symbolic — SymPy)
  → every sentence must carry a citation; uncited = ungrounded → strip/flag
```

Canon-only retrieval is the **firewall**: the generator cannot ground in unverified
material. This mirrors **Khanmigo's** published, lived practice, ground in vetted human content
*first* (accuracy improved measurably when they re-architected to pull human exercises/hints/solutions
Before responding), and **tool-call out for verifiable subtasks** (removing their calculator "math
agent" *doubled* math errors) ([Khan Academy: math/tutoring updates](https://blog.khanacademy.org/khanmigo-math-computation-and-tutoring-updates/);
[Khan responsible-AI framework](https://blog.khanacademy.org/khan-academys-framework-for-responsible-ai-in-education/)).
This is the S1, S7 tutor-safety gate from DECISIONS.md Convergence-3, extended to lesson/problem
Generation.

### d.2 Verification + eval stack

Runs on every generation; blocks ship:

| Stage | Method | Metric | Threshold |
|---|---|---|---|
| Faithfulness | **RAGAS faithfulness** ([docs](https://docs.ragas.io/en/stable/concepts/metrics/available_metrics/)) | supported-claims / total | **≥0.95** auto-pass; 0.85-0.95 → human; <0.85 reject |
| Atomic verification | **SAFE-style** decompose + NLI entailment **vs canon** (not web) ([SAFE, arXiv 2403.18802](https://arxiv.org/pdf/2403.18802)) | % atomic claims Supported | **100% Supported**; any Refuted → reject |
| Self-consistency pre-filter | **SelfCheckGPT-NLI**, N=5-10 ([arXiv 2303.08896](https://arxiv.org/pdf/2303.08896)) | mean contradiction prob | flag sentences > 0.5 |
| Closed-domain adherence | **ChainPoll-Adherence** ([arXiv 2310.18344](https://arxiv.org/pdf/2310.18344)) | adherence score | low → review |
| Retrieval quality | RAGAS context precision/recall | prec ≥0.7, recall ≥0.8 | below = retrieval bug |
| Pedagogical quality | rubric LLM-judge (factual / clarity / scaffolding / level) | per-trait pass | **different model family than the generator** |

**Defend every judge call** against LLM-as-judge bias: swap-and-average answer order (position bias
Up to 75%), mask provenance (self-preference 10-25%), penalize verbosity, prefer encoder ensembles
for safety gates ([llm-judge-bias](https://llm-judge-bias.github.io/)). **Never use the same model
family as both generator and judge.**

**CI rig:** a golden set of expert-vetted (topic, content, context) cases; the build **fails** if
Aggregate faithfulness or atomic-support drops vs the last release; every production miss becomes a
new golden case ([Braintrust eval guide](https://www.braintrust.dev/articles/llm-evaluation-guide)).
Sample ~5-10% of generations to a domain-expert queue monthly to recalibrate the judges.

### d.3 The 4-tier provenance model

Modeled on C2PA's well-formed → valid → trusted progression. This is the firewall between generated
material and the citable canon:

| Tier | Definition | Citable? | Usable as grounding? |
|---|---|---|---|
| **T0 Canon** | Human-authored or human-reviewed-and-approved; signed | Yes (authoritative) | **Yes, the only retrieval corpus** |
| **T1 Verified-AI** | AI-generated, passed the full §d.2 gate **AND** expert sign-off | Yes, labeled "AI-assisted, expert-reviewed" | Only after promotion to T0 |
| **T2 Generated** | AI-generated, passed the automated gate, no human review yet | No | No |
| **T3 Draft/Abstained** | Failed a gate, or retrieval was too weak | No | No |

**Provenance metadata on every artifact** (tamper-evident): `generator_model`, `timestamp`,
`retrieved_canon_chunk_ids`, `faithfulness_score`, `atomic_support_score`, `judge_scores`,
`trust_tier`, `human_reviewer_id`+`review_timestamp` (null until reviewed). Under EU AI Act Article 50,
Machine-readable AI-content marking becomes mandatory **2026-08-02**, so this is compliance, not just
hygiene ([C2PA explainer](https://spec.c2pa.org/specifications/specifications/2.4/explainer/Explainer.html)).

**Promotion rule (the invariant):** T2→T1 requires passing all automated gates; **T1→T0 requires
explicit domain-expert approval that writes `human_reviewer_id`.** Retrieval grounds **only on T0**.
This maps cleanly onto Bucket's existing canon model: human-reviewed `CANON_INDEX.md` = T0,
`_intake/` submissions = T2/T3 until expert promotion, and the existing **Longtail chisel queue** is
the human-review throughput valve.

---

## Map computation + visualization

KNOWLEDGE-ENGINEERING.md §2 + DECISIONS.md #9 already chose the Reach Score and react-force-graph.
The deeper pass surfaces **one bug to fix, one method to add, and the hairball fix**.

### e.1 The orientation bug

A prerequisite edge points A→B ("A needed before B"), but **importance flows the *other* way**, a
foundational atom is one *many things depend on*. The course-prerequisite-network paper is explicit:
**PageRank must be computed on the transpose** of the adjacency matrix
([Stavrinides & Zuev, arXiv 2210.01269](https://arxiv.org/pdf/2210.01269) /
[Applied Network Science 2023](https://link.springer.com/article/10.1007/s41109-023-00543-w)).
KNOWLEDGE-ENGINEERING.md §2.2 said "PageRank on the 0-direction", that's correct *if*
`requires` points dependent→prerequisite; the implementation must assert the orientation explicitly,
Because **getting it backwards inverts every ranking.** This is the #1 implementation bug for this
task. Validate with a sanity check: the top-PageRank atoms must be the most *introductory* ones.

### e.2 The four measures + Borda aggregation

The CPN papers validate exactly the measures KNOWLEDGE-ENGINEERING.md chose, and add **reach**:
- **out-degree** = local fundamentality (most interpretable; "how many atoms list this as a prereq");
- **transpose-PageRank @ α=0.85** = recursive fundamentality (favors the deepest foundations); use
 **personalized PageRank** (teleport vector on the learner's goal atoms) for learner-relative reach;
- **reach** = BFS transitive-closure size = "learn this and N total atoms become reachable" (the most
 intuitive reach metric; [Applied Network Science 2024](https://link.springer.com/article/10.1007/s41109-024-00637-z));
- **betweenness** = bridge/polymath atoms, **but never alone** (it's exactly **zero at every source
 and sink**, i.e. Blind to the most foundational entry atoms).

**Change vs DECISIONS.md #9:** instead of a hand-set weighted sum (α=0.45,β=0.30,γ=0.15,δ=0.10, a
Prior nobody validated), fuse the four rankings with **Borda-count meta-centrality** (rank under each
measure → Borda points → sum), using **Trimmed/noise-resistant Borda**
([meta-centrality Borda](https://medium.com/@mosabou/cumulative-rank-aggregation-of-a-family-of-network-centrality-indices-e625a76bf7e4)).
Rank aggregation is parameter-free and holds up when any one measure misbehaves, strictly better than
guessing four weights. Keep **k-core** only for *visual shells*, keeping it out of ranking (real prerequisite DAGs
are sparse, avg degree ≈ 3.4, so most atoms collapse into the 1-shell, poor resolution).

### e.3 Path computation pipeline

```
Tarjan SCC → condense to DAG  (flag any multi-node SCC as an authoring-error "co-requisite cluster")
  → topological STRATIFICATION  (ordered strata; free order within a stratum) ← the primary deliverable
  → longest-path / CPM  (minimum sequential depth to a goal; identifies critical-path atoms)
  → when one linear path is needed: greedy priority-queue topo-sort,
       tiebreak = front-load high Borda-leverage + minimize difficulty jump + minimize prereq distance
  → when per-learner mastery exists: KST outer-fringe walk as the adaptive next-step generator
```

The key insight: a topological order is **non-unique** (unique only if the DAG has a Hamiltonian path,
Which real prerequisite graphs never do), so a naive topo-sort imposes an *arbitrary* total order on
topologically-equivalent atoms, that arbitrariness is the defect. **Topological stratification**
(partition into ordered strata of equal-depth atoms, free order within a stratum) is the principled
Fix and is a *better deliverable* than a brittle single line, and it **reveals hidden
prerequisites** ([arXiv 2210.01269](https://arxiv.org/pdf/2210.01269)). This is also exactly the
layered structure the visualization needs (e.4).

### e.4 Visualization

The hairball fix + the library/scale matrix.

The "Obsidian hairball" happens because raw **force-directed** layout has no notion of hierarchy and
doesn't scale (O(n²) sim + SVG DOM wall). A prerequisite DAG has inherent direction
(foundations→advanced); wasting it on force-directed is the root cause. The research consensus: for
directed/hierarchical data, **layered (Sugiyama) layout beats force-directed**, and humans work better
with a root-on-top layered drawing ([Sugiyama method](https://blog.disy.net/sugiyama-method/)). **Map
each stratum (e.3) to one layer** → the hairball becomes a readable prerequisite ladder. Add
**semantic zoom / level-of-detail** (clusters at macro zoom, atoms at micro) and **edge bundling**.

| Scale | Stack | Render |
|---|---|---|
| **Data + algorithms (always)** | **graphology** | - |
| **Layout (always, for a DAG)** | **elkjs** (best Sugiyama) or **d3-dag/dagre** (lighter), layers = strata | - |
| **< 5k nodes** | **cytoscape.js** (rich styling) or **d3** (<~1k on SVG) | canvas / SVG |
| **5k, ~100k nodes** | **sigma.js** on graphology + semantic zoom + edge bundling | **WebGL** |
| **>100k → millions** | **cosmos.gl / Cosmograph** (GPU layout + render) | WebGL |
| React convenience | react-force-graph (DECISIONS.md #5), fine for the *nucleus shell*, but use a **layered layout, never raw force-directed** | WebGL/Canvas |

This **refines DECISIONS.md #5**: react-force-graph is OK as the renderer, but the *layout* must be
Sugiyama/layered (elkjs/dagre) keyed on strata, that's the "concentric-shell, never raw
force-directed" rule made precise.

**Accessibility (release gate, DECISIONS.md #19):** ship a parallel **list/table "graph mode"**,
Strata as headings, atoms as keyboard-navigable list items with "prerequisites: …" / "opens: …"
Links + per-node alt text. The stratification gives the heading hierarchy for free
([screen-reader vis, ACM TACCESS 3557899](https://dl.acm.org/doi/10.1145/3557899)).

---

## Build-order delta

- **P0 (now):** unchanged, `ts-fsrs` terminal quiz loop over ~40 biophysics atoms. **ADD:** the
 two-layer graph schema (`encompasses:` block) and the **transpose-PageRank orientation assertion**
 (cheap, prevents the §e.1 bug from day one).
- **P1:** **ADD the ALEKS state-search diagnostic** (`engine/diagnostic.py`) and the **Elo online
 estimator** (replaces BKT as the live proficiency number); Borda reach aggregation; Sugiyama
 layout. Generation+grounding eval stack (§d) with RAGAS/SAFE gates on any generated lesson.
- **P2:** **IRT calibration** (Elo→IRT promotion at ≥250 responses); the **credential** path,
 conjunctive retention-gated `M` formula, Angoff cut-setting, α/classification-consistency reporting;
 the **anti-gaming stack** (NT10 effort filter, gaming/wheel-spin/copy detectors, Sympson-Hetter
 exposure control, the practice/credential firewall).
- **P3:** optional **AKT** re-ranker (A/B-gated); the >5k-node WebGL viz; topological stratification UI.

## gaps / kill-criteria

1. **The fusion formula `M_k = P_k^α·R_k^β` is our own synthesis.** No paper backs it directly. It's principled
 (conjunctive, log-likelihood interpretable) but unvalidated. Kill-criterion: if certified learners
 fail test, retest at horizon T, raise β or T.
2. **Encompassing weights at biophysics granularity are untested** (FIRe is validated on math). Start
 with a *sparse* encompassing layer (only obvious edges), the literature says modest density already
 captures most of the efficiency.
3. **IRT/Elo/AKT all need response volume; for a single-learner pilot we run on Elo + priors** with
 wide CIs and *cannot yet certify*, the credential path is P2+, after a question bank exists.
4. **Diagnostic state-search assumes a clean DAG;** condense SCCs first (§e.3) or the state space is
 ill-defined.
5. **LLM graders/judges are foolable**, the adversarial-canary CI (§c.2) is mandatory;
 if a canary ever passes, the credential gate is compromised until re-tuned.

---

## Primary sources

**Production systems (the blueprints)**
- Cosyn, Uzun, Doble, Matayoshi (2021), *A practical perspective on KST: ALEKS and its data*, J. Math. Psych., [preprint PDF](https://jmatayoshi.github.io/publications/JMP2021_KST_ALEKS_preprint.pdf) *(the single best public description of a production KST diagnostic)*
- Skycak, *How Math Academy Creates its Knowledge Graph*, https://www.justinmath.com/how-math-academy-creates-its-knowledge-graph/
- Skycak, *Optimized, Individualized Spaced Repetition in Hierarchical Knowledge Structures* (FIRe), https://www.justinmath.com/individualized-spaced-repetition-in-hierarchical-knowledge-structures/
- Math Academy, *How Our AI Works*, https://www.mathacademy.com/how-our-ai-works · Matuschak first-hand notes, https://notes.andymatuschak.org/Math_Academy

**Knowledge tracing / skill estimation**
- Ghosh, Heffernan, Lan, *Context-Aware Attentive Knowledge Tracing* (AKT), KDD 2020, https://arxiv.org/abs/2007.12324 · [PDF](https://people.umass.edu/~andrewlan/papers/20kdd-akt.pdf) · [repo](https://github.com/arghosh/AKT)
- Choi et al., *Towards an Appropriate Query, Key, and Value Computation for KT* (SAINT), https://arxiv.org/pdf/2002.07033 · Shin et al., *SAINT+*, https://arxiv.org/abs/2010.12042
- Pelánek, *Applications of the Elo Rating System in Adaptive Educational Systems*, Computers & Education 2016, https://www.fi.muni.cz/~xpelanek/publications/CAE-elo.pdf
- de Ayala, *The Theory and Practice of Item Response Theory*, https://www.cms.guilford.com/books/The-Theory-and-Practice-of-Item-Response-Theory/R-de-Ayala/9781462547753/contents · Columbia IRT primer, https://www.publichealth.columbia.edu/research/population-health-methods/item-response-theory

**Credentialing / validity / reliability**
- Test-validity primer (Kane/Messick), https://pmc.ncbi.nlm.nih.gov/articles/PMC4803101/ · Kane argument-based validation, https://methods.sagepub.com/book/mono/preview/argument-based-validation-in-testing-and-assessment.pdf
- Standard-setting reliability, https://www.ncbi.nlm.nih.gov/pmc/articles/PMC1578558/ · Angoff reproducibility, https://www.ncbi.nlm.nih.gov/pmc/articles/PMC12522590/ · Cronbach's alpha, https://en.wikipedia.org/wiki/Cronbach's_alpha

**Assessment generation + anti-gaming**
- AIG systematic review (71 studies), https://www.tandfonline.com/doi/full/10.1080/10494820.2025.2482588 · KAQG (KG-enhanced AIG), https://arxiv.org/pdf/2505.07618 · Bloom-targeted generation, https://arxiv.org/pdf/2408.04394 · AI-exam field study (live IRT), https://arxiv.org/pdf/2508.08314
- LookAlike distractors, https://arxiv.org/pdf/2505.01903 · AutoSCORE grading, https://arxiv.org/html/2509.21910v1 · rubric self-refinement (QWK), https://arxiv.org/html/2510.09030
- GradingAttack, https://arxiv.org/pdf/2602.00979 · persuasive fluent-wrong inflation, https://arxiv.org/pdf/2508.07805
- NT10 rapid-guess thresholds, https://link.springer.com/article/10.1186/s40536-021-00100-w · Effort-Moderated IRT, https://www.researchgate.net/publication/229985871 · Baker gaming detection, https://link.springer.com/chapter/10.1007/11774303_38 · Beck & Gong wheel-spinning, https://www.semanticscholar.org/paper/0890bd77b4615cbe9aa6be27b4c9aa6772f3d74f · Sympson-Hetter exposure control, https://assess.com/sympson-hetter-item-exposure-control/

**Trustworthy AI content**
- RLHF destroys calibration, https://arxiv.org/abs/2410.09724 · RAGAS, https://docs.ragas.io/en/stable/concepts/metrics/available_metrics/ · SAFE (DeepMind), https://arxiv.org/pdf/2403.18802 · SelfCheckGPT, https://arxiv.org/pdf/2303.08896 · ChainPoll, https://arxiv.org/pdf/2310.18344 · FActScore, https://arxiv.org/pdf/2402.18045
- LLM-as-judge bias, https://llm-judge-bias.github.io/ · Khanmigo math/tutoring methodology, https://blog.khanacademy.org/khanmigo-math-computation-and-tutoring-updates/ · Khan responsible-AI framework, https://blog.khanacademy.org/khan-academys-framework-for-responsible-ai-in-education/ · C2PA, https://spec.c2pa.org/specifications/specifications/2.4/explainer/Explainer.html

**Graph computation + visualization**
- Stavrinides & Zuev, *Course-Prerequisite Networks*, https://arxiv.org/pdf/2210.01269 · [ApplNetSci 2023](https://link.springer.com/article/10.1007/s41109-023-00543-w) · *Comparative analysis* (introduces "reach"), https://link.springer.com/article/10.1007/s41109-024-00637-z
- Borda meta-centrality, https://medium.com/@mosabou/cumulative-rank-aggregation-of-a-family-of-network-centrality-indices-e625a76bf7e4 · longest-path/CPM, https://algs4.cs.princeton.edu/44sp/ · Sugiyama layout, https://blog.disy.net/sugiyama-method/ · elkjs, https://arxiv.org/pdf/2311.00533 · d3-dag, https://erikbrinkman.github.io/d3-dag/ · sigma.js, https://www.sigmajs.org/ · cosmos.gl, https://openjsf.org/blog/introducing-cosmos-gl · screen-reader viz, https://dl.acm.org/doi/10.1145/3557899
