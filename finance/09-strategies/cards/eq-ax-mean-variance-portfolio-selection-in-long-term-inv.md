# Mean-Variance Portfolio Selection in Long-Term Investments with Unknown Distribution: Online Estimation

ID: `eq-ax-mean-variance-portfolio-selection-in-long-term-inv`
Family: Equities
Retail feasibility: **C**
As of: 2026-11-27
Bead: `bkt-q5moa.15`
Origin: arXiv q-fin.TR or q-fin.PM 2015 to 2026

## Logic

From the abstract: The standard approach for constructing a Mean-Variance portfolio involves estimating parameters for the model using collected samples.

## Source

1. Mean-Variance Portfolio Selection in Long-Term Investments with Unknown Distribution: Online Estimation, Risk Aversion under Ambiguity, and Universality of Algorithms. Duy Khanh Lam, 2024, arXiv 2406.13486. https://arxiv.org/abs/2406.13486 (arXiv API, fetched 2026-11-27)

## Claimed Edge

The abstract reports: The original model is recast into an online learning framework, which is free from any statistical assumptions, to propose a dynamic strategy of sequential portfolios such that its empirical utility, Sharpe ratio, and growth rate asymptotically achieve those of the true portfolio, derived with perfect knowledge of the future data. Since risk aversion cannot be appropriately predetermined, another proposed algorithm updates this coefficient over time, forming a dynamic strategy that approaches the optimal empirical Sharpe ratio or growth rate associated with the true coefficient.

## Post-Publication Decay

Single arXiv study with no out-of-sample follow-up fetched. Grade C.

## Capacity

Unknown; the abstract gives no capacity figure. Treat as Small until tested.

## Data Needed

[D-market](../../03-data-sources/cards/D-market.md)

## Implementation

No open-source implementation in `code/`.

Grades: A retail with free data and a small account; B retail with paid data, margin or more capital; C edge thin after retail costs or needs low latency; D institutional balance sheet or access; F closed or not feasible.
