# Internal Bar Strength Reversal

ID: `etf-ibs-mean-reversion`
Family: ETFs and Macro
Retail feasibility: **B**
As of: 2026-11-27
Bead: `bkt-q5moa.15`
Origin: Kakushadze-Serur

## Logic

Compute internal bar strength, close minus low over high minus low. Buy ETFs closing near the day low, short those closing near the high, hold one day.

## Source

1. Kakushadze and Serur, 151 Trading Strategies, section 4.4. https://doi.org/10.1007/978-3-030-02792-6 (Crossref DOI, fetched 2026-11-27); Spanish edition arXiv 1912.04492 (arXiv API, fetched 2026-11-27)

## Claimed Edge

The book cites Pagonidis 2014 on IBS predicting next-day ETF returns.

## Post-Publication Decay

No fetched post-publication study for this strategy. Grade C.

## Capacity

Large.

## Data Needed

[D-market](../../03-data-sources/cards/D-market.md)

## Implementation

No open-source implementation in `code/`.

## Merged Duplicates

- code QuantConnect/Lean: Algorithm.Python/Alphas/GlobalEquityMeanReversionIBSAlpha.py

Grades: A retail with free data and a small account; B retail with paid data, margin or more capital; C edge thin after retail costs or needs low latency; D institutional balance sheet or access; F closed or not feasible.
