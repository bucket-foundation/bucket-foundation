# Mutual Fund Momentum

ID: `eq-mutual-fund-momentum`
Family: Equities
Retail feasibility: **A**
As of: 2026-11-27
Bead: `bkt-q5moa.15`
Origin: Quantpedia

## Logic

Each month buy the top decile of no-load equity funds by 6-month return and hold one month.

## Source

1. Quantpedia, Momentum in Mutual Fund Returns. https://quantpedia.com/strategies/momentum-in-mutual-fund-returns/ (web fetch, fetched 2026-11-27)
2. Sapp: The 52-Week High, Momentum, and Predicting Mutual Fund Returns. http://papers.ssrn.com/sol3/papers.cfm?abstract_id=1462408 (linked from Quantpedia; SSRN blocked the fetch )

## Claimed Edge

Quantpedia, from the source paper over 1973 to 2004: 19% per annum, Sharpe 0.77.

## Post-Publication Decay

No fetched post-publication study. Grade C.

Decay source: Does Academic Research Destroy Stock Return Predictability?. MCLEAN, PONTIFF, 2016, The Journal of Finance. https://doi.org/10.1111/jofi.12365 (Crossref search, fetched 2026-11-27)

## Capacity

Large.

## Data Needed

[D-market](../../03-data-sources/cards/D-market.md)

## Implementation

No open-source implementation in `code/`.

Grades: A retail with free data and a small account; B retail with paid data, margin or more capital; C edge thin after retail costs or needs low latency; D institutional balance sheet or access; F closed or not feasible.
