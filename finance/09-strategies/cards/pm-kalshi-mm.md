# Kalshi Market Making

ID: `pm-kalshi-mm`
Family: Prediction Markets
Retail feasibility: **A**
As of: 2026-11-27
Bead: `bkt-q5moa.5`

## Logic

Quote both sides of Kalshi event contracts, manage inventory across correlated markets.

## Source

1. Makers and Takers: The Economics of the Kalshi Prediction Market. Bürgi, Deng, Whelan, 2025. https://doi.org/10.2139/ssrn.5502658 (Crossref search, fetched 2026-11-27)
2. Liquidity Incentive Program. Kalshi Help Center. https://help.kalshi.com/en/articles/13823851-liquidity-incentive-program (fetched 2026-11-27)

## Claimed Edge

Burgi, Deng and Whelan find makers earn and takers lose on average.

## Post-Publication Decay

Kalshi runs a Liquidity Incentive Program that scores resting orders from per-second order book snapshots and pays each member a pro rata share of a reward pool.

Decay source: Makers and Takers: The Economics of the Kalshi Prediction Market. Bürgi, Deng, Whelan, 2025. https://doi.org/10.2139/ssrn.5502658 (Crossref search, fetched 2026-11-27)

## Capacity

Small.

## Data Needed

[D-market](../../03-data-sources/cards/D-market.md)

## Implementation

[kalshimarketmaker](../../08-software/kalshimarketmaker.md), [kalshi-starter-code-python](../../08-software/kalshi-starter-code-python.md)

## Merged Duplicates

Same logic found in bead `bkt-q5moa.15` sources:

- code KalshiMarketMaker: kalshi_market_maker/core/avellaneda.py
- code kalshi-ai-trading-bot: src/strategies/market_making.py

Grades: A retail with free data and a small account; B retail with paid data, margin or more capital; C edge thin after retail costs or needs low latency; D institutional balance sheet or access; F closed or not feasible.
