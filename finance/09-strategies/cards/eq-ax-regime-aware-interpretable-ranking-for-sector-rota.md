# Regime-Aware Interpretable Ranking for Sector Rotation

ID: `eq-ax-regime-aware-interpretable-ranking-for-sector-rota`
Family: Equities
Retail feasibility: **C**
As of: 2026-11-27
Bead: `bkt-q5moa.15`
Origin: arXiv q-fin.TR or q-fin.PM 2015 to 2026

## Logic

From the abstract: Such rankings should preserve temporal information, express model outputs through economically familiar signal characteristics, account for changes in signal relevance across macroeconomic environments, and capture dependencies among sectors. We propose RegimeRank, an interpretable sector-ranking model that represents fundamental and technical signals through expert-defined temporal characteristics, conditions them on learned macro factors via cross-attention, and models cross-sector dependencies through self-attention.

## Source

1. Regime-Aware Interpretable Ranking for Sector Rotation. Kelvin J. L. Koa and co-authors, 2026, arXiv 2610.26456. https://arxiv.org/abs/2610.26456 (arXiv API, fetched 2026-11-27)
2. Published version: https://doi.org/10.1145/3858063.3858823 (DOI listed by the arXiv API, fetched 2026-11-27)

## Claimed Edge

The abstract reports: We formulate this task as ranking sector actions by expected future risk-adjusted active performance, measured with forward sector-benchmark Sharpe ratios. We evaluate RegimeRank on weekly S&P 500 data from 2002 to 2024 under combinatorial purged cross-validation, where it outperforms representative ranking and machine-learning baselines across multiple ranking metrics.

## Post-Publication Decay

Single arXiv study with no out-of-sample follow-up fetched. Grade C.

## Capacity

Unknown; the abstract gives no capacity figure. Treat as Small until tested.

## Data Needed

[D-market](../../03-data-sources/cards/D-market.md)

## Implementation

No open-source implementation in `code/`.

Grades: A retail with free data and a small account; B retail with paid data, margin or more capital; C edge thin after retail costs or needs low latency; D institutional balance sheet or access; F closed or not feasible.
