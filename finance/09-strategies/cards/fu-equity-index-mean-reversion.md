# Country Index Mean Reversion

ID: `fu-equity-index-mean-reversion`
Family: Futures and CTA
Retail feasibility: **A**
As of: 2026-11-27
Bead: `bkt-q5moa.5`

## Logic

Buy country indexes that fell furthest from their long-run trend relative to the world.

## Source

1. Mean Reversion across National Stock Markets and Parametric Contrarian Investment Strategies. Balvers, Wu, Gilliland, 2000, The Journal of Finance. https://doi.org/10.1111/0022-1082.00225 (Crossref search, fetched 2026-11-27)
2. Quantpedia free strategy page. https://quantpedia.com/strategies/mean-reversion-effect-in-country-equity-indexes/ (fetched 2026-11-27)

## Claimed Edge

Mean reversion across 18 national markets with a half-life of 3 to 3.5 years.

## Post-Publication Decay

Multi-year holding makes it a value strategy in practice.

Decay source: Value and Momentum Everywhere. Asness, Moskowitz, Pedersen, 2013, The Journal of Finance. https://doi.org/10.1111/jofi.12021 (Crossref DOI, fetched 2026-11-27)

## Capacity

Large.

## Data Needed

[D-market](../../03-data-sources/cards/D-market.md)

## Implementation

[bt](../../08-software/bt.md)

## Merged Duplicates

Same logic found in bead `bkt-q5moa.15` sources:

- Quantpedia mean-reversion-effect-in-country-equity-indexes

Grades: A retail with free data and a small account; B retail with paid data, margin or more capital; C edge thin after retail costs or needs low latency; D institutional balance sheet or access; F closed or not feasible.
