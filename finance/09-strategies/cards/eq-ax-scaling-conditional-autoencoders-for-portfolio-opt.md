# Scaling Conditional Autoencoders for Portfolio Optimization via Uncertainty-Aware Factor Selection

ID: `eq-ax-scaling-conditional-autoencoders-for-portfolio-opt`
Family: Equities
Retail feasibility: **C**
As of: 2026-11-27
Bead: `bkt-q5moa.15`
Origin: arXiv q-fin.TR or q-fin.PM 2015 to 2026

## Logic

From the abstract: For each model, we rank factors by forecast uncertainty and retain the top-k most predictable factors for portfolio construction, where k denotes the selected subset of factors.

## Source

1. Scaling Conditional Autoencoders for Portfolio Optimization via Uncertainty-Aware Factor Selection. Ryan Engel and co-authors, 2025, arXiv 2511.17462. https://arxiv.org/abs/2511.17462 (arXiv API, fetched 2026-11-27)
2. Published version: https://doi.org/10.1145/3768292.3770415 (DOI listed by the arXiv API, fetched 2026-11-27)

## Claimed Edge

The abstract reports: Furthermore, due to each model's uncorrelated predictions, a performance-weighted ensemble outperforms individual models with higher Sharpe, Sortino, and Omega ratios.

## Post-Publication Decay

Single arXiv study with no out-of-sample follow-up fetched. Grade C.

## Capacity

Unknown; the abstract gives no capacity figure. Treat as Small until tested.

## Data Needed

[D-market](../../03-data-sources/cards/D-market.md)

## Implementation

No open-source implementation in `code/`.

Grades: A retail with free data and a small account; B retail with paid data, margin or more capital; C edge thin after retail costs or needs low latency; D institutional balance sheet or access; F closed or not feasible.
