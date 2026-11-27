# Synthetic Borrow Rates Predict SPY

ID: `etf-borrow-intensity`
Family: ETFs and Macro
Retail feasibility: **C**
As of: 2026-11-27
Bead: `bkt-q5moa.15`
Origin: Quantpedia

## Logic

Compute aggregate option-implied borrow intensity across stocks; hold SPY when it is low and cash when it is high.

## Source

1. Quantpedia, Synthetic Lending Rates Predict Subsequent Market Return. https://quantpedia.com/strategies/synthetic-lending-rates-predict-subsequent-market-return/ (web fetch, fetched 2026-11-27)
2. Synthetic Lending Rates Predict Subsequent Market Return. Padyšák, 2021, SSRN Electronic Journal. https://doi.org/10.2139/ssrn.3976307 (Crossref search, fetched 2026-11-27)

## Claimed Edge

Quantpedia, from the source paper over 2016 to 2021: 15.47% data from Table 1, Sharpe 0.79.

## Post-Publication Decay

No fetched post-publication study. Grade C.

## Capacity

Large.

## Data Needed

[D-market](../../03-data-sources/cards/D-market.md)

## Implementation

No open-source implementation in `code/`.

Grades: A retail with free data and a small account; B retail with paid data, margin or more capital; C edge thin after retail costs or needs low latency; D institutional balance sheet or access; F closed or not feasible.
