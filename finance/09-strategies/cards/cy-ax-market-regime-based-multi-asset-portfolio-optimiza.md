# Market Regime-Based Multi-Asset Portfolio Optimization Using Nested Clustered Optimization for Tactical Asset Allocation

ID: `cy-ax-market-regime-based-multi-asset-portfolio-optimiza`
Family: Crypto
Retail feasibility: **C**
As of: 2026-11-27
Bead: `bkt-q5moa.15`
Origin: arXiv q-fin.TR or q-fin.PM 2015 to 2026

## Logic

From the abstract: The central empirical question is whether conditioning the NCO pipeline, encompassing covariance estimation, hierarchical clustering, and weight allocation, on latent market states enhances risk-adjusted performance, or conversely, whether estimation uncertainty within regime-filtered sub-samples induces severe turnover and performance drag. We implement a causal rolling Gaussian Hidden Markov Model (HMM) coupled with an adaptive rebalancing mechanism that distinguishes regime shifts from portfolio weight drift.

## Source

1. Market Regime-Based Multi-Asset Portfolio Optimization Using Nested Clustered Optimization for Tactical Asset Allocation.  Supriadi and co-authors, 2026, arXiv 2610.27751. https://arxiv.org/abs/2610.27751 (arXiv API, fetched 2026-11-27)

## Claimed Edge

The abstract reports: Rigorous walk-forward backtesting reveals that standard regime-agnostic NCO achieves remarkable capital preservation and risk-adjusted efficiency, delivering a 29.97% cumulative return (5.78% annualized), a maximum drawdown of only 2.18%, a Calmar ratio of 2.65, and low monthly turnover of 5.41%.

## Post-Publication Decay

Single arXiv study with no out-of-sample follow-up fetched. Grade C.

## Capacity

Unknown; the abstract gives no capacity figure. Treat as Small until tested.

## Data Needed

[D-onchain](../../03-data-sources/cards/D-onchain.md)

## Implementation

No open-source implementation in `code/`.

Grades: A retail with free data and a small account; B retail with paid data, margin or more capital; C edge thin after retail costs or needs low latency; D institutional balance sheet or access; F closed or not feasible.
