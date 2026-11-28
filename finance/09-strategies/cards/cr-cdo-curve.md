# CDO Tranche Curve Trade

ID: `cr-cdo-curve`
Family: Credit
Retail feasibility: **D**
As of: 2026-11-27
Bead: `bkt-q5moa.15`
Origin: Kakushadze-Serur

## Logic

Sell protection on one tranche maturity and buy on another to trade the tranche term structure.

## Source

1. Kakushadze and Serur, 151 Trading Strategies, section 11.6. https://doi.org/10.1007/978-3-030-02792-6 (Crossref DOI, fetched 2026-11-27); Spanish edition arXiv 1912.04492 (arXiv API, fetched 2026-11-27)

## Claimed Edge

The book gives the rule only.

## Post-Publication Decay

No fetched post-publication study for this strategy. Grade C.

## Capacity

Small.

## Data Needed

[D-market](../../03-data-sources/cards/D-market.md)

## Implementation

No open-source implementation in `code/`.

Grades: A retail with free data and a small account; B retail with paid data, margin or more capital; C edge thin after retail costs or needs low latency; D institutional balance sheet or access; F closed or not feasible.
