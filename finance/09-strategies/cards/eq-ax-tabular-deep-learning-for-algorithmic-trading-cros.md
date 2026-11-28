# Tabular Deep Learning for Algorithmic Trading: Cross-Regime Bayesian Optimisation for Equity Signal Generation

ID: `eq-ax-tabular-deep-learning-for-algorithmic-trading-cros`
Family: Equities
Retail feasibility: **C**
As of: 2026-11-27
Bead: `bkt-q5moa.15`
Origin: arXiv q-fin.TR or q-fin.PM 2015 to 2026

## Logic

From the abstract: Alternative data plays a secondary role once technical and fundamental features are accounted for, as well as contributing more strongly on the short side than the long, and varies by model class. Regime-stable hyperparameter selection is associated with out-of-sample generalisation, as signal precision remains above the random baseline across all four quarters of the test period, and portfolio performance slowly degrades under simulated input noise before collapsing beyond a defined threshold.

## Source

1. Tabular Deep Learning for Algorithmic Trading: Cross-Regime Bayesian Optimisation for Equity Signal Generation. Joshua Le Grice, 2026, arXiv 2608.27076. https://arxiv.org/abs/2608.27076 (arXiv API, fetched 2026-11-27)

## Claimed Edge

The abstract reports: No individual tabular deep learning architecture outperforms gradient-boosted trees, but combining XGBoost and TabNet using rank aggregation produces a Hybrid ensemble with an annualised return of 51.26%, a Sharpe ratio of 2.44, and a statistically large CAPM alpha of 0.423 (p = 0.011). A near-zero beta indicates this outperformance is driven by stock selection, not market exposure. <!-- voice-ignore-line -->

## Post-Publication Decay

Single arXiv study with no out-of-sample follow-up fetched. Grade C.

## Capacity

Unknown; the abstract gives no capacity figure. Treat as Small until tested.

## Data Needed

[D-market](../../03-data-sources/cards/D-market.md)

## Implementation

No open-source implementation in `code/`.

Grades: A retail with free data and a small account; B retail with paid data, margin or more capital; C edge thin after retail costs or needs low latency; D institutional balance sheet or access; F closed or not feasible.
