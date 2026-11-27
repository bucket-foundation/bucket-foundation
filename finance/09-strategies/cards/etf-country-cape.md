# Country CAPE Value

ID: `etf-country-cape`
Family: ETFs and Macro
Retail feasibility: **A**
As of: 2026-11-27
Bead: `bkt-q5moa.15`
Origin: Quantpedia

## Logic

Each year buy the country ETFs with the lowest CAPE, a third of the universe, and hold one year.

## Source

1. Quantpedia, Value Factor - CAPE Effect within Countries. https://quantpedia.com/strategies/value-factor-effect-within-countries/ (web fetch, fetched 2026-11-27)
2. Global Cape Model Optimization. Butler and co-authors, 2012, SSRN Electronic Journal. https://doi.org/10.2139/ssrn.2163486 (Crossref search, fetched 2026-11-27)

## Claimed Edge

Quantpedia, from the source paper over 1980 to 2011: 14.7% per annum, Sharpe 0.56.

## Post-Publication Decay

No fetched post-publication study. Grade C.

## Capacity

Large.

## Data Needed

[D-market](../../03-data-sources/cards/D-market.md)

## Implementation

No open-source implementation in `code/`.

Grades: A retail with free data and a small account; B retail with paid data, margin or more capital; C edge thin after retail costs or needs low latency; D institutional balance sheet or access; F closed or not feasible.
