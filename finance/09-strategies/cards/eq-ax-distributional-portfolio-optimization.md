# Distributional Portfolio Optimization

ID: `eq-ax-distributional-portfolio-optimization`
Family: Equities
Retail feasibility: **C**
As of: 2026-11-27
Bead: `bkt-q5moa.15`
Origin: arXiv q-fin.TR or q-fin.PM 2015 to 2026

## Logic

From the abstract: Modern practice replaces at least one by a distribution: a posterior over parameters, a law of future returns, a stochastic allocation policy, or a distributional-robustness set. A controlled experiment shows that across factor models at K in {10,25,50}, the credible-radius rule lands within 3-7 bp of the oracle out-of-sample tail risk and beats a 24-month validation-tuned radius while spending no validation data.

## Source

1. Distributional Portfolio Optimization (DPO): A Unified Framework for Distributions over Weights, Returns, and Parameters. Miquel Noguer i Alonso, 2026, arXiv 2605.30464. https://arxiv.org/abs/2605.30464 (arXiv API, fetched 2026-11-27)

## Claimed Edge

The abstract reports: On a K=25 DJIA backtest, equal-weight, no-view Black-Litterman, and Ledoit-Wolf shrinkage attain higher Sharpe than every distributional method; the operational claim is therefore confined to calibration-without-validation and turnover, not raw-return dominance. <!-- voice-ignore-line -->

## Post-Publication Decay

Single arXiv study with no out-of-sample follow-up fetched. Grade C.

## Capacity

Unknown; the abstract gives no capacity figure. Treat as Small until tested.

## Data Needed

[D-market](../../03-data-sources/cards/D-market.md)

## Implementation

No open-source implementation in `code/`.

Grades: A retail with free data and a small account; B retail with paid data, margin or more capital; C edge thin after retail costs or needs low latency; D institutional balance sheet or access; F closed or not feasible.
