# Preregistration

Bead bkt-t08qr. Committed 2026-11-25 before any per-pair result was computed or seen.

## Disclosure

One pooled run already finished before this file existed. It gave a pooled held-out MAE difference, cognate minus base, of -5.8e-7 with a 95% bootstrap interval of [-2.6e-6, 1.7e-6], from 20 learner-clustered replicates. That run hit floating-point overflow in the loss, so its estimates are discarded. The plan below fixes the overflow by clipping the log half-life inside the loss, as Settles and Meeder 2016 do, and reruns everything. The pooled hypotheses below were therefore written after one pooled estimate was seen. The per-pair hypotheses were written blind.

## Data and split

Duolingo HLR traces, doi:10.7910/DVN/N8XJME, CC BY-NC 4.0. Events sorted by timestamp; first 90% train, last 10% test. Eight pairs, interface language first: en->de, en->es, en->fr, en->it, en->pt, es->en, it->en, pt->en.

## Models

Base: bias, sqrt(1+correct), sqrt(1+incorrect), log2(1+lemma length). Cognate: base plus orth_sim, phon_sim, etym_cognate, trans_missing, phon_missing. Loss, clipping and L2 as in `scripts/hlr.py`.

## Hypotheses

Family P, pooled:

- P1. H0: test MAE difference D = MAE_cog - MAE_base = 0. H1: D != 0.
- P2 to P4. H0: theta_j = 0 for j in orth_sim, phon_sim, etym_cognate. H1: theta_j != 0.

Family Q, per pair, one family for each of the four quantities above across the eight pairs:

- Q1,k. H0: D_k = 0 for pair k. H1: D_k != 0.
- Q2 to Q4,k. H0: theta_j,k = 0. H1: theta_j,k != 0.

## Tests

- Wald z = estimate / SE, SE the standard deviation of B = 200 learner-clustered Poisson bootstrap replicates; two-sided normal p. Coefficient replicates refit from the full-sample estimate; D replicates reweight the test set without refitting.
- Alpha 0.05 two-sided.
- Holm correction within P (four tests) and within each of the four Q families (eight tests each).
- Effect sizes: D in recall units; theta_j in log2 half-life units, reported also as the half-life ratio 2^theta_j. 95% percentile intervals.
- Minimum detectable effect at 80% power, alpha 0.05 two-sided: MDE = 2.80 * SE.
- Equivalence, TOST at alpha 0.05 for each P test and each Q test: bounds |D| < 0.001 recall units, and |theta_j| < 0.1 log2 half-life units, about a 7% change in half-life. Equivalence holds when both one-sided tests reject, equal to the 90% normal interval lying inside the bounds.

## Interpretation

- H0 rejected after Holm: an effect.
- H0 retained and TOST passes: absence of any effect larger than the bound.
- H0 retained and TOST fails: inconclusive, underpowered at that bound; the MDE is reported.

## Secondary

Polingual FSRS logs are used only if they contain at least 1,000 learners with per-review history. Checked by `make polingual`.

## Deviations

Recorded after the analysis ran. Each one changes how a quantity is estimated. None changes a hypothesis or a preregistered bound.

- Standard errors. The 200 learner-clustered bootstrap refits exceeded the memory of the analysis machine. Learner-clustered sandwich standard errors replace them; both target the same sampling variance.
- Sample. Every model is fit on a 2,000,000-event subsample, drawn with seed 20261125 at the same rate in every language pair, under a 10 GB memory cap. The time-ordered 90/10 split runs inside it.
- Controls, added after critic review: log translation count enters both models, and two positive controls, lexeme indicators and removal of the history features, show how far MAE moves on the same split.
- Second MAE bound, added after critic review: TOST at plus or minus 5e-5, under half the lexeme-control effect, beside the preregistered 0.001.
