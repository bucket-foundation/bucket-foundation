# Perpetual Funding-Rate Basis

ID: `cy-perp-funding-basis`
Family: Crypto
Retail feasibility: **A**
As of: 2026-11-27
Bead: `bkt-q5moa.5`

## Logic

Buy spot, short the perpetual future of the same coin, collect funding paid by longs.

## Source

1. Fundamentals of Perpetual Futures. arXiv. https://arxiv.org/abs/2212.06888 (arXiv abstract page, fetched 2026-11-27)

## Claimed Edge

He, Manela, Ross and von Wachter find perpetual-spot deviations in crypto larger than in traditional markets, leaving room for arbitrage.

## Post-Publication Decay

He, Manela, Ross and von Wachter find perpetual-versus-spot deviations in crypto are larger than in currency markets, comove across currencies and diminish over time, with an implied arbitrage strategy yielding high Sharpe ratios.

Decay source: Fundamentals of Perpetual Futures. arXiv. https://arxiv.org/abs/2212.06888 (arXiv abstract page, fetched 2026-11-27)

## Capacity

Medium. Billions across venues.

## Data Needed

[D-onchain](../../03-data-sources/cards/D-onchain.md), [D-market](../../03-data-sources/cards/D-market.md)

## Implementation

[hummingbot](../../08-software/hummingbot.md), [freqtrade](../../08-software/freqtrade.md), [ccxt](../../08-software/ccxt.md)

## Merged Duplicates

Same logic found in bead `bkt-q5moa.15` sources:

- code hummingbot: hummingbot/strategy/spot_perpetual_arbitrage/

Grades: A retail with free data and a small account; B retail with paid data, margin or more capital; C edge thin after retail costs or needs low latency; D institutional balance sheet or access; F closed or not feasible.
