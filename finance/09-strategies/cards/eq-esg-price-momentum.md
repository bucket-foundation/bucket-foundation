# ESG-Filtered Price Momentum

ID: `eq-esg-price-momentum`
Family: Equities
Retail feasibility: **C**
As of: 2026-11-27
Bead: `bkt-q5moa.15`
Origin: Quantpedia

## Logic

Select a portfolio that maximizes 12-1 month momentum subject to a minimum total ESG score, solved as a knapsack problem.

## Source

1. Quantpedia, ESG, Price Momentum and Stochastic Optimization. https://quantpedia.com/strategies/esg-price-momentum-and-stochastic-optimization/ (web fetch, fetched 2026-11-27)
2. ESG Scores and Price Momentum Are More Than Compatible. Padyšák, 2020, Crossref. https://doi.org/10.2139/ssrn.3650163 (Crossref search, fetched 2026-11-27)

## Claimed Edge

Quantpedia, from the source paper over 2010 to 2019: 17.47% data from Table 1, Sharpe 1.29.

## Post-Publication Decay

No fetched post-publication study. Grade C.

Decay source: Does Academic Research Destroy Stock Return Predictability?. MCLEAN, PONTIFF, 2016, The Journal of Finance. https://doi.org/10.1111/jofi.12365 (Crossref search, fetched 2026-11-27)

## Capacity

Large.

## Data Needed

[D-filings](../../03-data-sources/cards/D-filings.md), [D-market](../../03-data-sources/cards/D-market.md)

## Implementation

No open-source implementation in `code/`.

Grades: A retail with free data and a small account; B retail with paid data, margin or more capital; C edge thin after retail costs or needs low latency; D institutional balance sheet or access; F closed or not feasible.
