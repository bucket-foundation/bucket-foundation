# Merger Arbitrage

ID: `eq-merger-arbitrage`
Family: Equities
Retail feasibility: **B**
As of: 2026-11-27
Bead: `bkt-q5moa.5`

## Logic

Buy targets of announced cash deals, short the acquirer in stock deals, earn the spread on completion.

## Source

1. Characteristics of Risk and Return in Risk Arbitrage. Mitchell, Pulvino, 2001. https://doi.org/10.2139/ssrn.268144 (Crossref search, fetched 2026-11-27)
2. Kakushadze and Serur, 151 Trading Strategies, section 3.16. https://doi.org/10.1007/978-3-030-02792-6 (Crossref DOI, fetched 2026-11-27)

## Claimed Edge

Across 4,750 deals 1963-1998, risk arbitrage returns are uncorrelated with flat and rising markets and correlated with severe declines, like a short index put.

## Post-Publication Decay

Spreads compress as hedge funds enter. Deal-break risk is the cost.

Decay source: Characteristics of Risk and Return in Risk Arbitrage. Mitchell, Pulvino, 2001. https://doi.org/10.2139/ssrn.268144 (Crossref search, fetched 2026-11-27)

## Capacity

Medium. Bounded by deal flow.

## Data Needed

[D-filings](../../03-data-sources/cards/D-filings.md), [D-market](../../03-data-sources/cards/D-market.md)

## Implementation

No open-source implementation in `code/`.

## Merged Duplicates

Same logic found in bead `bkt-q5moa.15` sources:

- KS 3.16

Grades: A retail with free data and a small account; B retail with paid data, margin or more capital; C edge thin after retail costs or needs low latency; D institutional balance sheet or access; F closed or not feasible.
