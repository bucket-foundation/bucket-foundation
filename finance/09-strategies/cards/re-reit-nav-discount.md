# REIT Discount to NAV

ID: `re-reit-nav-discount`
Family: Real Estate
Retail feasibility: **B**
As of: 2026-11-27
Bead: `bkt-q5moa.5`

## Logic

Buy REITs trading below net asset value, expect take-private bids or convergence.

## Source

1. 151 Trading Strategies. Kakushadze, Serur, 2018. https://doi.org/10.1007/978-3-030-02792-6 (Crossref DOI, fetched 2026-11-27)

## Claimed Edge

Kakushadze and Serur list REIT relative-value trades.

## Post-Publication Decay

Private and public real estate values converge with a lag of a year or more.

Decay source: 151 Trading Strategies. Kakushadze, Serur, 2018. https://doi.org/10.1007/978-3-030-02792-6 (Crossref DOI, fetched 2026-11-27)

## Capacity

Medium.

## Data Needed

[D-market](../../03-data-sources/cards/D-market.md), [D-filings](../../03-data-sources/cards/D-filings.md)

## Implementation

No open-source implementation in `code/`.

Grades: A retail with free data and a small account; B retail with paid data, margin or more capital; C edge thin after retail costs or needs low latency; D institutional balance sheet or access; F closed or not feasible.
