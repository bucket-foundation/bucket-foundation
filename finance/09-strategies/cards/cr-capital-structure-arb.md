# Capital Structure Arbitrage

ID: `cr-capital-structure-arb`
Family: Credit
Retail feasibility: **D**
As of: 2026-11-27
Bead: `bkt-q5moa.5`

## Logic

Compare CDS spreads to equity-implied credit spreads; trade the gap.

## Source

1. How Profitable is Capital Structure Arbitrage?. Yu, 2005. https://doi.org/10.2139/ssrn.687436 (Crossref search, fetched 2026-11-27)
2. Kakushadze and Serur, 151 Trading Strategies, section 3.20. https://doi.org/10.1007/978-3-030-02792-6 (Crossref DOI, fetched 2026-11-27)

## Claimed Edge

Individual trades are risky; portfolio returns resemble other fixed-income arbitrage.

## Post-Publication Decay

Yu's 2006 test shows large losses when equity and credit diverge further.

Decay source: How Profitable is Capital Structure Arbitrage?. Yu, 2005. https://doi.org/10.2139/ssrn.687436 (Crossref search, fetched 2026-11-27)

## Capacity

Medium.

## Data Needed

[D-market](../../03-data-sources/cards/D-market.md), [D-macro](../../03-data-sources/cards/D-macro.md)

## Implementation

No open-source implementation in `code/`.

Grades: A retail with free data and a small account; B retail with paid data, margin or more capital; C edge thin after retail costs or needs low latency; D institutional balance sheet or access; F closed or not feasible.
