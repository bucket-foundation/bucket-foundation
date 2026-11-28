# Zero-Days-to-Expiry Options

ID: `op-0dte`
Family: Options and Volatility
Retail feasibility: **D**
As of: 2026-11-27
Bead: `bkt-q5moa.5`

## Logic

Sell or buy same-day index options intraday.

## Source

1. Retail Traders Love 0DTE Options... But Should They?. Beckmeyer, Branger, Gayda, 2023. https://doi.org/10.2139/ssrn.4404704 (Crossref search, fetched 2026-11-27)

## Claimed Edge

Over 75% of retail S&P 500 option trades are 0DTE, and retail investors lose money on them despite price improvement.

## Post-Publication Decay

Sellers face gap risk; buyers pay spreads above the edge.

Decay source: Retail Traders Love 0DTE Options... But Should They?. Beckmeyer, Branger, Gayda, 2023. https://doi.org/10.2139/ssrn.4404704 (Crossref search, fetched 2026-11-27)

## Capacity

Large in volume.

## Data Needed

[D-market](../../03-data-sources/cards/D-market.md)

## Implementation

No open-source implementation in `code/`.

## Merged Duplicates

Same logic found in bead `bkt-q5moa.15` sources:

- code lumibot: lumibot/example_strategies/ai_0dte_options_trading_bot.py

Grades: A retail with free data and a small account; B retail with paid data, margin or more capital; C edge thin after retail costs or needs low latency; D institutional balance sheet or access; F closed or not feasible.
