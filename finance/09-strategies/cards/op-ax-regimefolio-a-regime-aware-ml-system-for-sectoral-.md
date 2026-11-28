# RegimeFolio: A Regime Aware ML System for Sectoral Portfolio Optimization in Dynamic Markets

ID: `op-ax-regimefolio-a-regime-aware-ml-system-for-sectoral-`
Family: Options and Volatility
Retail feasibility: **C**
As of: 2026-11-27
Bead: `bkt-q5moa.15`
Origin: arXiv q-fin.TR or q-fin.PM 2015 to 2026

## Logic

From the abstract: To address these challenges, we propose RegimeFolio, a new regime-aware and sector-specialized framework that, unlike existing regime-agnostic models such as DeepVol and DRL optimizers, integrates explicit volatility regime segmentation with sector-specific ensemble forecasting and adaptive mean-variance allocation. RegimeFolio combines three components: (i) an interpretable VIX-based classifier for market regime detection; (ii) regime and sector-specific ensemble learners (Random Forest, Gradient Boosting) to capture conditional return structures; and (iii) a dynamic mean-variance optimizer with shrinkage-regularized covariance estimates for regime-aware allocation.

## Source

1. RegimeFolio: A Regime Aware ML System for Sectoral Portfolio Optimization in Dynamic Markets. Yiyao Zhang and co-authors, 2025, arXiv 2510.14986. https://arxiv.org/abs/2510.14986 (arXiv API, fetched 2026-11-27)

## Claimed Edge

The abstract reports: The framework achieves a cumulative return of 137 percent, a Sharpe ratio of 1.17, a 12 percent lower maximum drawdown, and a 15 to 20 percent improvement in forecast accuracy compared to conventional and advanced machine learning benchmarks.

## Post-Publication Decay

Single arXiv study with no out-of-sample follow-up fetched. Grade C.

## Capacity

Unknown; the abstract gives no capacity figure. Treat as Small until tested.

## Data Needed

[D-market](../../03-data-sources/cards/D-market.md)

## Implementation

No open-source implementation in `code/`.

Grades: A retail with free data and a small account; B retail with paid data, margin or more capital; C edge thin after retail costs or needs low latency; D institutional balance sheet or access; F closed or not feasible.
