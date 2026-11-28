# Cross-Venue Prediction Market Arbitrage

ID: `pm-cross-venue-arb`
Family: Prediction Markets
Retail feasibility: **A**
As of: 2026-11-27
Bead: `bkt-q5moa.5`

## Logic

Buy YES on one venue and NO on the other when the two prices sum below $1 after fees.

## Source

1. Unravelling the Probabilistic Forest: Arbitrage in Prediction Markets. arXiv. https://arxiv.org/abs/2508.03474 (arXiv abstract page, fetched 2026-11-27)
2. Semantic Non-Fungibility and Violations of the Law of One Price in Prediction Markets. arXiv. https://arxiv.org/abs/2601.01706 (fetched 2026-11-27)

## Claimed Edge

Saguillo and co-authors measure tens of millions of dollars in arbitrage on Polymarket.

## Post-Publication Decay

Across ten venues, semantically equivalent prediction markets show persistent execution-aware price deviations of 2-4% on average.

Decay source: Unravelling the Probabilistic Forest: Arbitrage in Prediction Markets. arXiv. https://arxiv.org/abs/2508.03474 (arXiv abstract page, fetched 2026-11-27)

## Capacity

Small.

## Data Needed

[D-onchain](../../03-data-sources/cards/D-onchain.md), [D-market](../../03-data-sources/cards/D-market.md)

## Implementation

[poly-kalshi-arb](../../08-software/poly-kalshi-arb.md), [pmxt](../../08-software/pmxt.md)

## Merged Duplicates

Same logic found in bead `bkt-q5moa.15` sources:

- code poly-kalshi-arb: src/execution.rs

Grades: A retail with free data and a small account; B retail with paid data, margin or more capital; C edge thin after retail costs or needs low latency; D institutional balance sheet or access; F closed or not feasible.
