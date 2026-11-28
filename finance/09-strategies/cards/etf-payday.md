# Payday Anomaly

ID: `etf-payday`
Family: ETFs and Macro
Retail feasibility: **B**
As of: 2026-11-27
Bead: `bkt-q5moa.15`
Origin: Quantpedia

## Logic

Hold the S&P 500 only around the 16th of each month, a common payday, and stay in cash otherwise.

## Source

1. Quantpedia, Payday Anomaly. https://quantpedia.com/strategies/payday-anomaly/ (web fetch, fetched 2026-11-27)
2. Ma, Aixin and Pratt, William Robert: Payday Anomaly. https://ssrn.com/abstract=3257064 (linked from Quantpedia; SSRN blocked the fetch )

## Claimed Edge

Quantpedia, from the source paper over 1980 to 2010: 2.57% data from table 4, Sharpe 0.6.

## Post-Publication Decay

No fetched post-publication study. Grade C.

## Capacity

Large.

## Data Needed

[D-market](../../03-data-sources/cards/D-market.md)

## Implementation

No open-source implementation in `code/`.

Grades: A retail with free data and a small account; B retail with paid data, margin or more capital; C edge thin after retail costs or needs low latency; D institutional balance sheet or access; F closed or not feasible.
