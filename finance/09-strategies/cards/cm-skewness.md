# Commodity Skewness

ID: `cm-skewness`
Family: Commodities
Retail feasibility: **B**
As of: 2026-11-27
Bead: `bkt-q5moa.5`

## Logic

Short commodities with the most positive return skew, long the most negative.

## Source

1. Commodities as Lotteries: Skewness and the Returns of Commodity Futures. Fernandez-Perez, Frijns, Fuertes, Miffre, 2015, SSRN Electronic Journal. https://doi.org/10.2139/ssrn.2671165 (Crossref search, fetched 2026-11-27)
2. Quantpedia free strategy page. https://quantpedia.com/strategies/skewness-effect-in-commodities/ (fetched 2026-11-27)

## Claimed Edge

Long low-skew, short high-skew commodity portfolios earn significant excess returns.

## Post-Publication Decay

Recent, little out-of-sample record.

Decay source: Does Academic Research Destroy Stock Return Predictability?. Mclean, Pontiff, 2016, The Journal of Finance. https://doi.org/10.1111/jofi.12365 (Crossref DOI, fetched 2026-11-27)

## Capacity

Large.

## Data Needed

[D-market](../../03-data-sources/cards/D-market.md)

## Implementation

No open-source implementation in `code/`.

## Merged Duplicates

Same logic found in bead `bkt-q5moa.15` sources:

- KS 9.5
- Quantpedia skewness-effect-in-commodities

Grades: A retail with free data and a small account; B retail with paid data, margin or more capital; C edge thin after retail costs or needs low latency; D institutional balance sheet or access; F closed or not feasible.
