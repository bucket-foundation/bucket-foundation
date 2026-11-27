# Spark Spread

ID: `cm-spark-spread`
Family: Commodities
Retail feasibility: **C**
As of: 2026-11-27
Bead: `bkt-q5moa.15`
Origin: Kakushadze-Serur

## Logic

Trade power futures against the gas needed to generate it at a plant heat rate; buy the spread when below generation cost norms.

## Source

1. Kakushadze and Serur, 151 Trading Strategies, section 14.4. https://doi.org/10.1007/978-3-030-02792-6 (Crossref DOI, fetched 2026-11-27); Spanish edition arXiv 1912.04492 (arXiv API, fetched 2026-11-27)

## Claimed Edge

Spread levels depend on plant efficiency and regional grids.

## Post-Publication Decay

No fetched post-publication study for this strategy. Grade C.

## Capacity

Medium.

## Data Needed

[D-market](../../03-data-sources/cards/D-market.md)

## Implementation

No open-source implementation in `code/`.

Grades: A retail with free data and a small account; B retail with paid data, margin or more capital; C edge thin after retail costs or needs low latency; D institutional balance sheet or access; F closed or not feasible.
