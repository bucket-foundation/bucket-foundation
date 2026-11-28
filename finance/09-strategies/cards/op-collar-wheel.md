# The Wheel

ID: `op-collar-wheel`
Family: Options and Volatility
Retail feasibility: **A**
As of: 2026-11-27
Bead: `bkt-q5moa.5`

## Logic

Sell cash-secured puts; if assigned, sell covered calls until called away.

## Source

1. Covered Calls Uncovered. Israelov, Nielsen, 2014. https://doi.org/10.2139/ssrn.2444999 (Crossref search, fetched 2026-11-27)

## Claimed Edge

Return equals short put plus covered call, a short-volatility equity position.

## Post-Publication Decay

No independent edge beyond the volatility premium.

Decay source: Covered Calls Uncovered. Israelov, Nielsen, 2014. https://doi.org/10.2139/ssrn.2444999 (Crossref search, fetched 2026-11-27)

## Capacity

Large.

## Data Needed

[D-market](../../03-data-sources/cards/D-market.md)

## Implementation

No open-source implementation in `code/`.

## Merged Duplicates

Same logic found in bead `bkt-q5moa.15` sources:

- code lumibot: lumibot/example_strategies/ai_wheel

Grades: A retail with free data and a small account; B retail with paid data, margin or more capital; C edge thin after retail costs or needs low latency; D institutional balance sheet or access; F closed or not feasible.
