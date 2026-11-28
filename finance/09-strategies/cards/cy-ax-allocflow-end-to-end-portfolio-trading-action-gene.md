# AllocFlow: End-to-End Portfolio Trading Action Generation from Raw Market Data

ID: `cy-ax-allocflow-end-to-end-portfolio-trading-action-gene`
Family: Crypto
Retail feasibility: **C**
As of: 2026-11-27
Bead: `bkt-q5moa.15`
Origin: arXiv q-fin.TR or q-fin.PM 2015 to 2026

## Logic

From the abstract: However, traditional pipelines decouple signal forecasting from portfolio construction, potentially misaligning learning with allocation and execution objectives. We present AllocFlow, an end-to-end flow-matching framework that directly generates joint portfolio allocations from raw multi-asset market histories.

## Source

1. AllocFlow: End-to-End Portfolio Trading Action Generation from Raw Market Data. Annan Wang and co-authors, 2026, arXiv 2611.19937. https://arxiv.org/abs/2611.19937 (arXiv API, fetched 2026-11-27)

## Claimed Edge

The abstract reports: Advances in forecasting models and alpha discovery help identify opportunities. On hourly cryptocurrency perpetual futures, RL refinement raises the annualized net return of the imitation policy from $27.79\%$ to $51.38\%$ and its Calmar ratio from $0.955$ to $4.043$, surpassing the teacher strategy on every metric, and AllocFlow reaches a Calmar ratio of $4.90$ on six further months of unseen 2026 data without retraining.

## Post-Publication Decay

Single arXiv study with no out-of-sample follow-up fetched. Grade C.

## Capacity

Unknown; the abstract gives no capacity figure. Treat as Small until tested.

## Data Needed

[D-onchain](../../03-data-sources/cards/D-onchain.md)

## Implementation

No open-source implementation in `code/`.

Grades: A retail with free data and a small account; B retail with paid data, margin or more capital; C edge thin after retail costs or needs low latency; D institutional balance sheet or access; F closed or not feasible.
