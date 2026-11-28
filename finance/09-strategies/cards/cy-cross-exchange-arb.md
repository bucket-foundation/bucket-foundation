# Cross-Exchange Price Arbitrage

ID: `cy-cross-exchange-arb`
Family: Crypto
Retail feasibility: **C**
As of: 2026-11-27
Bead: `bkt-q5moa.5`

## Logic

Buy on the cheap exchange, sell on the expensive one, move coins when capital controls allow.

## Source

1. Trading and arbitrage in cryptocurrency markets. Makarov, Schoar, 2020, Journal of Financial Economics. https://doi.org/10.1016/j.jfineco.2019.07.001 (Crossref DOI, fetched 2026-11-27)
2. Kakushadze and Serur, 151 Trading Strategies, section 18.1. https://doi.org/10.1007/978-3-030-02792-6 (Crossref DOI, fetched 2026-11-27)

## Claimed Edge

Makarov and Schoar document large, recurring price gaps across countries, larger across capital controls.

## Post-Publication Decay

Gaps persist only across capital controls; inside one jurisdiction they close in seconds.

Decay source: Trading and arbitrage in cryptocurrency markets. Makarov, Schoar, 2020, Journal of Financial Economics. https://doi.org/10.1016/j.jfineco.2019.07.001 (Crossref DOI, fetched 2026-11-27)

## Capacity

Small.

## Data Needed

[D-market](../../03-data-sources/cards/D-market.md)

## Implementation

[hummingbot](../../08-software/hummingbot.md), [ccxt](../../08-software/ccxt.md)

## Merged Duplicates

Same logic found in bead `bkt-q5moa.15` sources:

- code OctoBot: packages/tentacles/Trading/Mode/arbitrage_trading_mode

Grades: A retail with free data and a small account; B retail with paid data, margin or more capital; C edge thin after retail costs or needs low latency; D institutional balance sheet or access; F closed or not feasible.
