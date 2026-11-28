# Smart Factor Momentum with Market

ID: `etf-factor-timing-blend`
Family: ETFs and Macro
Retail feasibility: **B**
As of: 2026-11-27
Bead: `bkt-q5moa.15`
Origin: Quantpedia

## Logic

Time each equity factor with fast and slow past-return signals and blend the timed factors with the market portfolio.

## Source

1. Quantpedia, Combining Smart Factors Momentum and Market Portfolio. https://quantpedia.com/strategies/combining-smart-factors-momentum-and-market-portfolio/ (web fetch, fetched 2026-11-27)
2. The Active vs Passive: Smart Factors, Market Portfolio or Both?. Padyšák, 2020, SSRN Electronic Journal. https://doi.org/10.2139/ssrn.3745517 (Crossref search, fetched 2026-11-27)

## Claimed Edge

Quantpedia, from the source paper over 1993 to 2020: 11.91% data from Table 2, Sharpe 1.14.

## Post-Publication Decay

No fetched post-publication study. Grade C.

## Capacity

Large.

## Data Needed

[D-market](../../03-data-sources/cards/D-market.md)

## Implementation

No open-source implementation in `code/`.

Grades: A retail with free data and a small account; B retail with paid data, margin or more capital; C edge thin after retail costs or needs low latency; D institutional balance sheet or access; F closed or not feasible.
