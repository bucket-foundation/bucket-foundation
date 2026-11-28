# Multi-Outcome Sum Arbitrage

ID: `pm-intra-market-arb`
Family: Prediction Markets
Retail feasibility: **A**
As of: 2026-11-27
Bead: `bkt-q5moa.5`

## Logic

In markets with many mutually exclusive outcomes, buy all YES when they sum below $1, or all NO when above.

## Source

1. Unravelling the Probabilistic Forest: Arbitrage in Prediction Markets. arXiv. https://arxiv.org/abs/2508.03474 (arXiv abstract page, fetched 2026-11-27)

## Claimed Edge

Saguillo and co-authors find rebalancing arbitrage common in multi-outcome markets.

## Post-Publication Decay

Bots compete; gas and capital lockup until resolution cut the return.

Decay source: Unravelling the Probabilistic Forest: Arbitrage in Prediction Markets. arXiv. https://arxiv.org/abs/2508.03474 (arXiv abstract page, fetched 2026-11-27)

## Capacity

Small.

## Data Needed

[D-onchain](../../03-data-sources/cards/D-onchain.md)

## Implementation

[poly_data](../../08-software/poly_data.md), [prediction-market-analysis](../../08-software/prediction-market-analysis.md)

## Merged Duplicates

Same logic found in bead `bkt-q5moa.15` sources:

- code prediction-market-backtesting: strategies/binary_pair_arbitrage.py
- code prediction-market-backtesting: strategies/passive_pair_accumulation.py

Grades: A retail with free data and a small account; B retail with paid data, margin or more capital; C edge thin after retail costs or needs low latency; D institutional balance sheet or access; F closed or not feasible.
