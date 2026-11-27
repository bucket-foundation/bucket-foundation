# Paired Switching

ID: `etf-paired-switching`
Family: ETFs and Macro
Retail feasibility: **A**
As of: 2026-11-27
Bead: `bkt-q5moa.15`
Origin: Quantpedia

## Logic

Hold whichever of a stock fund and a bond fund had the higher return over the past quarter, switch quarterly.

## Source

1. Quantpedia, Paired Switching. https://quantpedia.com/strategies/paired-switching/ (web fetch, fetched 2026-11-27)
2. Paired-Switching for Tactical Portfolio Allocation. Maewal, Bock, 2011, SSRN Electronic Journal. https://doi.org/10.2139/ssrn.1917044 (Crossref search, fetched 2026-11-27)

## Claimed Edge

Quantpedia, from the source paper over 1991 to 2011: 11.3% per annum, Sharpe 0.78.

## Post-Publication Decay

No fetched post-publication study. Grade C.

## Capacity

Large.

## Data Needed

[D-market](../../03-data-sources/cards/D-market.md)

## Implementation

No open-source implementation in `code/`.

Grades: A retail with free data and a small account; B retail with paid data, margin or more capital; C edge thin after retail costs or needs low latency; D institutional balance sheet or access; F closed or not feasible.
