# Triangular Arbitrage

ID: `fx-triangular`
Family: FX
Retail feasibility: **D**
As of: 2026-11-27
Bead: `bkt-q5moa.5`

## Logic

Trade three currency pairs when cross rates disagree.

## Source

1. Execution Risk in High-Frequency Arbitrage. Kozhan, Tham, 2012, SSRN Electronic Journal. https://doi.org/10.2139/ssrn.2030767 (Crossref search, fetched 2026-11-27)
2. Kakushadze and Serur, 151 Trading Strategies, section 8.4. https://doi.org/10.1007/978-3-030-02792-6 (Crossref DOI, fetched 2026-11-27)

## Claimed Edge

Opportunities exist for milliseconds.

## Post-Publication Decay

Kozhan and Tham show execution risk eats the edge as competition grows.

Decay source: Execution Risk in High-Frequency Arbitrage. Kozhan, Tham, 2012, SSRN Electronic Journal. https://doi.org/10.2139/ssrn.2030767 (Crossref search, fetched 2026-11-27)

## Capacity

Small.

## Data Needed

[D-market](../../03-data-sources/cards/D-market.md)

## Implementation

[hftbacktest](../../08-software/hftbacktest.md), [hummingbot](../../08-software/hummingbot.md)

## Merged Duplicates

Same logic found in bead `bkt-q5moa.15` sources:

- KS 8.5
- code QuantConnect/Lean: Algorithm.Python/Alphas/TriangleExchangeRateArbitrageAlpha.py

Grades: A retail with free data and a small account; B retail with paid data, margin or more capital; C edge thin after retail costs or needs low latency; D institutional balance sheet or access; F closed or not feasible.
