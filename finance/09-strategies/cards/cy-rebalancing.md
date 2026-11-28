# Crypto Rebalancing Premium

ID: `cy-rebalancing`
Family: Crypto
Retail feasibility: **A**
As of: 2026-11-27
Bead: `bkt-q5moa.5`

## Logic

Rebalance an equal-weight basket of large coins on a schedule.

## Source

1. Rebalancing Premium in Cryptocurrencies - Quantpedia. web. https://quantpedia.com/strategies/rebalancing-premium-in-cryptocurrencies/ (web page, fetched 2026-11-27)
2. Quantpedia free strategy page. https://quantpedia.com/strategies/rebalancing-premium-in-cryptocurrencies/ (fetched 2026-11-27)

## Claimed Edge

Quantpedia lists a rebalancing premium from high vol and low correlation.

## Post-Publication Decay

Decay source: Common Risk Factors in Cryptocurrency. Liu, Tsyvinski, Wu, 2022, The Journal of Finance. https://doi.org/10.1111/jofi.13119 (Crossref DOI, fetched 2026-11-27)

## Capacity

Medium.

## Data Needed

[D-market](../../03-data-sources/cards/D-market.md)

## Implementation

[freqtrade](../../08-software/freqtrade.md)

## Merged Duplicates

Same logic found in bead `bkt-q5moa.15` sources:

- Quantpedia rebalancing-premium-in-cryptocurrencies
- code OctoBot: packages/tentacles/Trading/Mode/index_trading_mode
- code binance-trading-bot: packages/strategy/rebalance
- code lumibot: lumibot/example_strategies/crypto_50_50.py

Grades: A retail with free data and a small account; B retail with paid data, margin or more capital; C edge thin after retail costs or needs low latency; D institutional balance sheet or access; F closed or not feasible.
