# Near-Certain Outcome Harvesting

ID: `pm-near-certain-harvest`
Family: Prediction Markets
Retail feasibility: **B**
As of: 2026-11-27
Bead: `bkt-q5moa.5`

## Logic

Buy outcomes priced at 95 to 99 cents once the result is all but known, collect the rest at resolution.

## Source

1. Overview - Polymarket Documentation. web. https://docs.polymarket.com/ (web page, fetched 2026-11-27)
2. Price as Truth: Market Prices, Oracle Governance, and the Limits of Decentralized Dispute Resolution. Lin, 2026. https://doi.org/10.2139/ssrn.6874201 (fetched 2026-11-27)

## Claimed Edge

Small return per trade with short holding time.

## Post-Publication Decay

One study of 134 disputed Polymarket contracts resolved by UMA token-weighted voting finds votes track pre-resolution market prices.

Decay source: Unravelling the Probabilistic Forest: Arbitrage in Prediction Markets. arXiv. https://arxiv.org/abs/2508.03474 (arXiv abstract page, fetched 2026-11-27)

## Capacity

Small.

## Data Needed

[D-onchain](../../03-data-sources/cards/D-onchain.md)

## Implementation

[poly_data](../../08-software/poly_data.md)

## Merged Duplicates

Same logic found in bead `bkt-q5moa.15` sources:

- code kalshi-ai-trading-bot: src/strategies/safe_compounder.py
- code prediction-market-backtesting: backtests/polymarket_btc_5m_late_favorite_taker_hold.py
- code prediction-market-backtesting: strategies/late_favorite_limit_hold.py

Grades: A retail with free data and a small account; B retail with paid data, margin or more capital; C edge thin after retail costs or needs low latency; D institutional balance sheet or access; F closed or not feasible.
