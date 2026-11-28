# Intraday ETF Arbitrage

ID: `etf-intraday-index-arb`
Family: ETFs and Macro
Retail feasibility: **C**
As of: 2026-11-27
Bead: `bkt-q5moa.15`
Origin: Kakushadze-Serur

## Logic

Trade two ETFs on the same index, or an ETF against its basket, when intraday prices diverge beyond costs.

## Source

1. Kakushadze and Serur, 151 Trading Strategies, section 6.4. https://doi.org/10.1007/978-3-030-02792-6 (Crossref DOI, fetched 2026-11-27); Spanish edition arXiv 1912.04492 (arXiv API, fetched 2026-11-27)
2. ETF Arbitrage: Intraday Evidence. Marshall and co-authors, 2010, Crossref. https://doi.org/10.2139/ssrn.1709599 (Crossref search, fetched 2026-11-27)

## Claimed Edge

The book cites Marshall, Nguyen and Visaltanachoti 2013, who found short-lived SPY and IVV mispricings.

## Post-Publication Decay

No fetched post-publication study for this strategy. Grade C.

## Capacity

Medium.

## Data Needed

[D-market](../../03-data-sources/cards/D-market.md)

## Implementation

No open-source implementation in `code/`.

Grades: A retail with free data and a small account; B retail with paid data, margin or more capital; C edge thin after retail costs or needs low latency; D institutional balance sheet or access; F closed or not feasible.
