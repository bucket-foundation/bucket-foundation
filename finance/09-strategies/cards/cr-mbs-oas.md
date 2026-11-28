# MBS Option-Adjusted Spread

ID: `cr-mbs-oas`
Family: Credit
Retail feasibility: **D**
As of: 2026-11-27
Bead: `bkt-q5moa.15`
Origin: Kakushadze-Serur

## Logic

Buy agency mortgage pools with high option-adjusted spread, hedge duration and prepayment risk with Treasuries or swaps.

## Source

1. Kakushadze and Serur, 151 Trading Strategies, section 11.7. https://doi.org/10.1007/978-3-030-02792-6 (Crossref DOI, fetched 2026-11-27); Spanish edition arXiv 1912.04492 (arXiv API, fetched 2026-11-27)
2. Limits of Arbitrage: Theory and Evidence from the Mortgage-Backed Securities Market. Gabaix and co-authors, 2005, Crossref. https://doi.org/10.3386/w11851 (Crossref search, fetched 2026-11-27)

## Claimed Edge

The book cites Gabaix, Krishnamurthy and Vigneron 2007, who found prepayment risk carries a premium.

## Post-Publication Decay

No fetched post-publication study for this strategy. Grade C.

## Capacity

Large.

## Data Needed

[D-market](../../03-data-sources/cards/D-market.md), [D-macro](../../03-data-sources/cards/D-macro.md)

## Implementation

No open-source implementation in `code/`.

Grades: A retail with free data and a small account; B retail with paid data, margin or more capital; C edge thin after retail costs or needs low latency; D institutional balance sheet or access; F closed or not feasible.
