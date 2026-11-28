# Mean-Variance Statistical Arbitrage

ID: `eq-stat-arb-optimization`
Family: Equities
Retail feasibility: **D**
As of: 2026-11-27
Bead: `bkt-q5moa.15`
Origin: Kakushadze-Serur

## Logic

Forecast short-horizon returns, then solve a mean-variance problem with dollar neutrality and factor exposure limits for the weights.

## Source

1. Kakushadze and Serur, 151 Trading Strategies, section 3.18. https://doi.org/10.1007/978-3-030-02792-6 (Crossref DOI, fetched 2026-11-27); Spanish edition arXiv 1912.04492 (arXiv API, fetched 2026-11-27)

## Claimed Edge

The book gives the method only. No return figure.

## Post-Publication Decay

No fetched post-publication study for this strategy. Grade C.

Decay source: Does Academic Research Destroy Stock Return Predictability?. MCLEAN, PONTIFF, 2016, The Journal of Finance. https://doi.org/10.1111/jofi.12365 (Crossref search, fetched 2026-11-27)

## Capacity

Medium.

## Data Needed

[D-market](../../03-data-sources/cards/D-market.md)

## Implementation

No open-source implementation in `code/`.

Grades: A retail with free data and a small account; B retail with paid data, margin or more capital; C edge thin after retail costs or needs low latency; D institutional balance sheet or access; F closed or not feasible.
