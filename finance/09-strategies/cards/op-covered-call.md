# Covered Calls

ID: `op-covered-call`
Family: Options and Volatility
Retail feasibility: **A**
As of: 2026-11-27
Bead: `bkt-q5moa.5`

## Logic

Hold stock and sell out-of-the-money calls.

## Source

1. Covered Calls Uncovered. Israelov, Nielsen, 2014. https://doi.org/10.2139/ssrn.2444999 (Crossref search, fetched 2026-11-27)
2. Kakushadze and Serur, 151 Trading Strategies, section 2.1. https://doi.org/10.1007/978-3-030-02792-6 (Crossref DOI, fetched 2026-11-27)

## Claimed Edge

Return decomposes into equity beta, short volatility and an equity timing drag.

## Post-Publication Decay

Israelov and Nielsen show the timing component hurts; delta-hedging improves it.

Decay source: Covered Calls Uncovered. Israelov, Nielsen, 2014. https://doi.org/10.2139/ssrn.2444999 (Crossref search, fetched 2026-11-27)

## Capacity

Large.

## Data Needed

[D-market](../../03-data-sources/cards/D-market.md)

## Implementation

No open-source implementation in `code/`.

## Merged Duplicates

Same logic found in bead `bkt-q5moa.15` sources:

- KS 2.2
- code QuantConnect/Lean: Algorithm.Python/CoveredAndProtectiveCallStrategiesAlgorithm.py

Grades: A retail with free data and a small account; B retail with paid data, margin or more capital; C edge thin after retail costs or needs low latency; D institutional balance sheet or access; F closed or not feasible.
