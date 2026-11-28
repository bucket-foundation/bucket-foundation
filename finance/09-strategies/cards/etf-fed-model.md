# Fed Model Yield Gap Timing

ID: `etf-fed-model`
Family: ETFs and Macro
Retail feasibility: **A**
As of: 2026-11-27
Bead: `bkt-q5moa.15`
Origin: Quantpedia

## Logic

Regress next-month excess stock returns on the gap between earnings yield and the 10-year Treasury yield; hold stocks when the forecast is positive.

## Source

1. Quantpedia, FED Model. https://quantpedia.com/strategies/fed-model/ (web fetch, fetched 2026-11-27)
2. Fight the Fed Model: The Relationship between Stock Market Yields, Bond Market Yields, and Future Returns. Asness, 2003, Crossref. https://doi.org/10.2139/ssrn.381480 (Crossref search, fetched 2026-11-27)

## Claimed Edge

Quantpedia, from the source paper over 1959 to 2003: 11% per annum.

## Post-Publication Decay

No fetched post-publication study. Grade C.

## Capacity

Large.

## Data Needed

[D-macro](../../03-data-sources/cards/D-macro.md), [D-market](../../03-data-sources/cards/D-market.md)

## Implementation

No open-source implementation in `code/`.

Grades: A retail with free data and a small account; B retail with paid data, margin or more capital; C edge thin after retail costs or needs low latency; D institutional balance sheet or access; F closed or not feasible.
