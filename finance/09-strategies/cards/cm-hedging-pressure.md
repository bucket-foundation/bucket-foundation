# Hedging Pressure

ID: `cm-hedging-pressure`
Family: Commodities
Retail feasibility: **B**
As of: 2026-11-27
Bead: `bkt-q5moa.5`

## Logic

Use CFTC Commitments of Traders to go long where hedgers are net short.

## Source

1. Capturing the Risk Premium of Commodity Futures: The Role of Hedging Pressure. Basu, Miffre, 2009. https://doi.org/10.2139/ssrn.1340873 (Crossref search, fetched 2026-11-27)

## Claimed Edge

Hedging-pressure portfolios earn premia beyond momentum and term structure.

## Post-Publication Decay

COT data public weekly with a lag.

Decay source: Does Academic Research Destroy Stock Return Predictability?. Mclean, Pontiff, 2016, The Journal of Finance. https://doi.org/10.1111/jofi.12365 (Crossref DOI, fetched 2026-11-27)

## Capacity

Large.

## Data Needed

[D-market](../../03-data-sources/cards/D-market.md), [D-macro](../../03-data-sources/cards/D-macro.md)

## Implementation

No open-source implementation in `code/`.

## Merged Duplicates

Same logic found in bead `bkt-q5moa.15` sources:

- KS 9.2

Grades: A retail with free data and a small account; B retail with paid data, margin or more capital; C edge thin after retail costs or needs low latency; D institutional balance sheet or access; F closed or not feasible.
