# Polymarket Liquidity Rewards Market Making

ID: `pm-polymarket-mm`
Family: Prediction Markets
Retail feasibility: **A**
As of: 2026-11-27
Bead: `bkt-q5moa.5`

## Logic

Post two-sided limit orders near the midpoint on the Polymarket CLOB to earn spread and liquidity rewards.

## Source

1. Overview - Polymarket Documentation. web. https://docs.polymarket.com/ (web page, fetched 2026-11-27)
2. Liquidity Rewards - Polymarket Documentation. web. https://docs.polymarket.com/market-makers/liquidity-rewards (fetched 2026-11-27)

## Claimed Edge

Polymarket pays daily liquidity rewards scored on quote size and distance to midpoint.

## Post-Publication Decay

Polymarket splits liquidity rewards pro rata by score, so more makers dilute each maker's share.

Decay source: Unravelling the Probabilistic Forest: Arbitrage in Prediction Markets. arXiv. https://arxiv.org/abs/2508.03474 (arXiv abstract page, fetched 2026-11-27)

## Capacity

Small.

## Data Needed

[D-onchain](../../03-data-sources/cards/D-onchain.md)

## Implementation

[poly-maker](../../08-software/poly-maker.md), [py-clob-client](../../08-software/py-clob-client.md)

## Merged Duplicates

Same logic found in bead `bkt-q5moa.15` sources:

- code poly-maker: src/polymaker/catalog/scoring.py
- code poly-maker: src/polymaker/strategy/quoting.py
- code poly-maker: src/polymaker/strategy/regime.py

Grades: A retail with free data and a small account; B retail with paid data, margin or more capital; C edge thin after retail costs or needs low latency; D institutional balance sheet or access; F closed or not feasible.
