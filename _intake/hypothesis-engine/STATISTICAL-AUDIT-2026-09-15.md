# Statistical Audit of the Hypothesis Engine

Written after the first live Younger Dryas campaign (`docs/YOUNGER-DRYAS.md`,
"Campaign one, live") answered the question "any finding against the
mainstream?" with a no that the engine's own construction had decided in
advance. Each item names the stage, the principle it violates, the cost on
the live run, and the fix. Bead ids are in `BEADS-PENDING.jsonl` under
source `bkt-nuc 2026-09-15 audit`.

## The one-line diagnosis

Mainstream is the null hypothesis, and the null enters through the prior
`a` (a three-level label assigned by one model reading the literature),
through unlinked evidence (unlinked collapses to P = a), through an
address-sorted population cap, through unblinded model roles that see the
label, and through calibration against the literature's own record. On
the Younger Dryas corpus the best meltwater and impact hypotheses carry
identical evidence (b = 0.502, d = 0, u = 0.498); under a flat prior they
tie at 0.751. The reported gap, 0.941 against 0.562, is the label.

## Priors

| Practice today | Principle | Cost on the live run | Fix |
|---|---|---|---|
| `a` is a point value from `ConsensusStatus` | Hierarchical Bayes: a distribution on the prior, updated by data | The label never moves, whatever the corpus says | `a ~ Beta` per actor, label as starting mean, posterior carried across campaigns |
| One agent assigned every label | Structured elicitation (Cooke): several assessors, seed questions, performance weighting | Prior is one model's reading of the majority | Three assessors from two model families plus one human; seeds from the vindicated-alternatives set |
| Reports show P only | Jeffreys: report prior odds and Bayes factor apart | Evidence-only value is 0.502 for both leading actors; the report showed 0.941 vs 0.562 | Print `b − d` and the likelihood ratio next to P on every surface |
| No sensitivity beyond four fixed profiles | Reverse Bayes: the prior a conclusion needs | Impact fails the 0.6 floor by 0.038 of prior-filled mass | Tipping-point prior per gated claim in `survivors.json` and `TIMELINE.md` |

## Hypothesis space and sampling

| Practice today | Principle | Cost | Fix |
|---|---|---|---|
| `sorted(by_address)[:400]` | Random or stratified sampling, frame recorded | Keeps the lowest vocabulary indices, whichever actors those are | Stratified sample by actor and status; frame in the manifest |
| 3,649 evidence-driven vs 150 combinatorial per seed | Importance sampling by status | Alternative space rides on 150 draws | Proportional draws per status class |
| Each address scored as an independent proposition | Partition of competing explanations; Bayes factors; likelihood ratio 1 for shared evidence | Meltwater and impact for one event can both sit above 0.9 | Explanandum partitions with normalized posterior odds |
| No complexity penalty | Occam factor, MDL | Specificity of the vocabulary decides rank | Penalize slot specificity and interval width |

## Evidence

| Practice today | Principle | Cost | Fix |
|---|---|---|---|
| `r = D(n₊)·S₊`, fixed W = 2 | Likelihood model per item, P(E|H)/P(E|¬H) | One item gives b = 0.502 to every hypothesis; strong and weak items match | Elicited or estimated likelihood ratio per evidence kind |
| Dependence via stemma and surname proxy | Effective sample size from a dependence graph | Meltglass and platinum groups counted as independent | Coauthor, lab, and method edges; ESS in the opinion |
| Unlinked = P = a | Missing-not-at-random handling | 292 of 360 survivors unscored and reported as unsupported | Linker recall per actor on a labeled set; unlinked marked unscored |
| Cards chosen by one agent, no stance audit | Stated search protocol, inclusion criteria before retrieval, file-drawer check | 60 of 68 bound survivors carry only refutations | Stance counts per actor in the corpus doc; protocol hash in the manifest |
| Tier = venue | Reliability from track record, empirical Bayes shrinkage | Same measurement counts less from an alternative venue | Overturn and retraction rates per source, shrunk to tier mean |
| Additive cross-kind bonus | Independence must be estimated | Kinds assumed independent | Log-linear with estimated interaction, or no bonus |

## Model roles

| Practice today | Principle | Cost | Fix |
|---|---|---|---|
| One model family in every role | Ensemble diversity, uncorrelated errors | Critic and judge share the generator's blind spots | Second family on critic and judge; disagreement rate logged |
| Critic and judge see names and labels | Blinding; classifier error rates; inter-rater reliability | Top ten by Elo: nine unbound consensus hypotheses | Neutral ids, linked evidence in prompt, gold set by status, kappa, label-swap test |
| Every role asked to be right | Adversarial role | No pressure toward the alternative | Devil's advocate scored on support found for low-prior survivors |
| Elo, two rounds, 360 items | Bradley-Terry with covariates; rank intervals | Rating is seeding plus noise | Evidence mass as covariate; bootstrap over rounds |

## Evaluation

| Practice today | Principle | Cost | Fix |
|---|---|---|---|
| Brier against literature-dated events | Proper scoring needs a truth that is not the null | A correct lift of a true alternative scores worse | Vindicated-alternatives holdout and exploded-claims negative controls |
| Ten held-out events | Power and interval reporting | Coverage 0.30 has a Wilson interval near 0.11 to 0.60 | Intervals on every rate; no claims below detectable difference |
| Vocabulary built with all discoveries known | Temporal freezing | Slot values leak the future into the holdout | Vocabulary snapshot at the cutoff |
| 3,205 hypotheses, one floor | FDR control | False positives mainstream, false negatives alternative | Benjamini-Hochberg on lift or Bayesian FDR |
| Chao1 at three seeds | Independent samples, estimator variance | 189,255 on 3,205 observed | Good-Turing until a seed floor; variance printed |
| No controls | Shuffle, placebo, positive control | Prior-only ranking undetected | Link permutation test; placebo actors; vindicated set |
| Finding criteria written after the run | Preregistration | Criteria excluded fringe by design | Floor, gate, and criteria hashed into the manifest before generation |

## Order

1. Evidence-only lift as headline, tipping-point prior per claim, stance audit per corpus.
2. Stratified sampling in place of the address cap.
3. Blinded critic and judge with the label-swap test and a second model family.
4. Partition normalization with Bayes factors.
5. Vindicated-alternatives holdout and frozen-vocabulary calibration.
6. Likelihood-ratio evidence model, dependence graph, track-record source reliability.
