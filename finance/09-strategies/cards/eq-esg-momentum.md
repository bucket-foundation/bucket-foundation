# ESG Rating Momentum

ID: `eq-esg-momentum`
Family: Equities
Retail feasibility: **D**
As of: 2026-11-27
Bead: `bkt-q5moa.15`
Origin: Quantpedia

## Logic

Overweight stocks whose ESG rating rose most over the past year and underweight those whose rating fell.

## Source

1. Quantpedia, ESG Factor Momentum Strategy. https://quantpedia.com/strategies/esg-factor-momentum-strategy/ (web fetch, fetched 2026-11-27)
2. Zoltán Nagy, Altaf Kassam, Linda-Eling Lee: CAN ESG ADD ALPHA?. https://www.semanticscholar.org/paper/Can-ESG-Add-Alpha-An-Analysis-of-ESG-Tilt-and-Nagy-Kassam/64f77da4f8ce5906a73ffe4e9eec7c49c0960acc (linked from Quantpedia; SSRN blocked the fetch )

## Claimed Edge

Quantpedia, from the source paper over 2007 to 2015: 2.23% data from Exhibit 8, Sharpe 0.89.

## Post-Publication Decay

No fetched post-publication study. Grade C.

Decay source: Does Academic Research Destroy Stock Return Predictability?. MCLEAN, PONTIFF, 2016, The Journal of Finance. https://doi.org/10.1111/jofi.12365 (Crossref search, fetched 2026-11-27)

## Capacity

Large.

## Data Needed

[D-filings](../../03-data-sources/cards/D-filings.md)

## Implementation

No open-source implementation in `code/`.

Grades: A retail with free data and a small account; B retail with paid data, margin or more capital; C edge thin after retail costs or needs low latency; D institutional balance sheet or access; F closed or not feasible.
