# Commodity Momentum

ID: `cm-momentum`
Family: Commodities
Retail feasibility: **B**
As of: 2026-11-27
Bead: `bkt-q5moa.5`

## Logic

Long commodities with the best past returns, short the worst.

## Source

1. Momentum Strategies in Commodity Futures Markets. Miffre, Rallis, 2005. https://doi.org/10.2139/ssrn.702281 (Crossref search, fetched 2026-11-27)
2. Kakushadze and Serur, 151 Trading Strategies, section 9.2. https://doi.org/10.1007/978-3-030-02792-6 (Crossref DOI, fetched 2026-11-27)
3. Quantpedia free strategy page. https://quantpedia.com/strategies/momentum-effect-in-commodities/ (fetched 2026-11-27)

## Claimed Edge

Miffre and Rallis find 13 profitable momentum strategies at about 9% a year.

## Post-Publication Decay

Shares trend following weakness in the 2010s.

Decay source: Time series momentum: Is it there?. Huang, Li, Wang, Zhou, 2020, Journal of Financial Economics. https://doi.org/10.1016/j.jfineco.2019.08.004 (Crossref DOI, fetched 2026-11-27)

## Capacity

Large.

## Data Needed

[D-market](../../03-data-sources/cards/D-market.md)

## Implementation

[pysystemtrade](../../08-software/pysystemtrade.md)

## Merged Duplicates

Same logic found in bead `bkt-q5moa.15` sources:

- Quantpedia momentum-effect-in-commodities

Grades: A retail with free data and a small account; B retail with paid data, margin or more capital; C edge thin after retail costs or needs low latency; D institutional balance sheet or access; F closed or not feasible.
