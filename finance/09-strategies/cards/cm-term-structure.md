# Commodity Term Structure, Roll Yield

ID: `cm-term-structure`
Family: Commodities
Retail feasibility: **B**
As of: 2026-11-27
Bead: `bkt-q5moa.5`

## Logic

Long backwardated commodities, short contangoed ones.

## Source

1. The Fundamentals of Commodity Futures Returns. Gorton, Hayashi, Rouwenhorst, 2012, Review of Finance. https://doi.org/10.1093/rof/rfs019 (Crossref DOI, fetched 2026-11-27)
2. Kakushadze and Serur, 151 Trading Strategies, section 9.1. https://doi.org/10.1007/978-3-030-02792-6 (Crossref DOI, fetched 2026-11-27)
3. Quantpedia free strategy page. https://quantpedia.com/strategies/term-structure-effect-in-commodities/ (fetched 2026-11-27)

## Claimed Edge

Backwardated commodities earn higher returns linked to low inventories.

## Post-Publication Decay

Erb and Harvey show roll yield drives most long-run commodity returns; the signal is public and crowded.

Decay source: The Strategic and Tactical Value of Commodity Futures. Erb, Harvey, 2006, Financial Analysts Journal. https://doi.org/10.2469/faj.v62.n2.4084 (Crossref DOI, fetched 2026-11-27)

## Capacity

Large.

## Data Needed

[D-market](../../03-data-sources/cards/D-market.md)

## Implementation

[pysystemtrade](../../08-software/pysystemtrade.md)

## Merged Duplicates

Same logic found in bead `bkt-q5moa.15` sources:

- KS 9.1
- Quantpedia term-structure-effect-in-commodities

Grades: A retail with free data and a small account; B retail with paid data, margin or more capital; C edge thin after retail costs or needs low latency; D institutional balance sheet or access; F closed or not feasible.
