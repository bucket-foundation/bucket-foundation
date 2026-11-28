# Low-Risk Bond Factor

ID: `rt-low-risk-bonds`
Family: Rates
Retail feasibility: **B**
As of: 2026-11-27
Bead: `bkt-q5moa.15`
Origin: Kakushadze-Serur

## Logic

Overweight short-maturity or low-volatility bonds on a risk-adjusted basis, levered to target risk.

## Source

1. Kakushadze and Serur, 151 Trading Strategies, section 5.9. https://doi.org/10.1007/978-3-030-02792-6 (Crossref DOI, fetched 2026-11-27); Spanish edition arXiv 1912.04492 (arXiv API, fetched 2026-11-27)
2. Betting Against Beta. Frazzini, Pedersen, 2012, Crossref. https://doi.org/10.2139/ssrn.2049939 (Crossref search, fetched 2026-11-27)

## Claimed Edge

The book cites Frazzini and Pedersen 2014, who found betting against beta works in Treasuries and credit.

## Post-Publication Decay

No fetched post-publication study for this strategy. Grade C.

## Capacity

Large.

## Data Needed

[D-macro](../../03-data-sources/cards/D-macro.md)

## Implementation

No open-source implementation in `code/`.

Grades: A retail with free data and a small account; B retail with paid data, margin or more capital; C edge thin after retail costs or needs low latency; D institutional balance sheet or access; F closed or not feasible.
