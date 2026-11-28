# Value and Momentum Everywhere

ID: `etf-value-momentum-everywhere`
Family: ETFs and Macro
Retail feasibility: **B**
As of: 2026-11-27
Bead: `bkt-q5moa.5`

## Logic

Run value and momentum in country indexes, bonds, currencies and commodities; combine them.

## Source

1. Value and Momentum Everywhere. Asness, Moskowitz, Pedersen, 2013, The Journal of Finance. https://doi.org/10.1111/jofi.12021 (Crossref DOI, fetched 2026-11-27)
2. Quantpedia free strategy page. https://quantpedia.com/strategies/value-and-momentum-factors-across-asset-classes/ (fetched 2026-11-27)

## Claimed Edge

Value and momentum premia appear in eight markets, and value and momentum are negatively correlated with each other.

## Post-Publication Decay

Jensen, Kelly and Pedersen find most asset pricing factors replicate and work out of sample in a data set covering 93 countries.

Decay source: Is There a Replication Crisis in Finance?. Jensen, Kelly, Pedersen, 2023, The Journal of Finance. https://doi.org/10.1111/jofi.13249 (Crossref DOI, fetched 2026-11-27)

## Capacity

Large.

## Data Needed

[D-market](../../03-data-sources/cards/D-market.md), [D-macro](../../03-data-sources/cards/D-macro.md)

## Implementation

[pysystemtrade](../../08-software/pysystemtrade.md)

## Merged Duplicates

Same logic found in bead `bkt-q5moa.15` sources:

- Quantpedia value-and-momentum-factors-across-asset-classes
- code pysystemtrade: systems/provided/rules/rel_mom.py

Grades: A retail with free data and a small account; B retail with paid data, margin or more capital; C edge thin after retail costs or needs low latency; D institutional balance sheet or access; F closed or not feasible.
