# Sector Momentum Rotation

ID: `etf-sector-momentum`
Family: ETFs and Macro
Retail feasibility: **A**
As of: 2026-11-27
Bead: `bkt-q5moa.15`
Origin: Kakushadze-Serur

## Logic

Each month buy the sector ETFs with the highest 6 to 12 month return. Section 4.1.1 adds a moving-average filter that moves to cash in downtrends.

## Source

1. Kakushadze and Serur, 151 Trading Strategies, section 4.1. https://doi.org/10.1007/978-3-030-02792-6 (Crossref DOI, fetched 2026-11-27); Spanish edition arXiv 1912.04492 (arXiv API, fetched 2026-11-27)

## Claimed Edge

The book cites Faber 2010 on sector rotation beating buy-and-hold.

## Post-Publication Decay

No fetched post-publication study for this strategy. Grade C.

## Capacity

Large.

## Data Needed

[D-market](../../03-data-sources/cards/D-market.md)

## Implementation

No open-source implementation in `code/`.

## Merged Duplicates

- code qstrader: examples/momentum_taa.py

Grades: A retail with free data and a small account; B retail with paid data, margin or more capital; C edge thin after retail costs or needs low latency; D institutional balance sheet or access; F closed or not feasible.
