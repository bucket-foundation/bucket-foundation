# HP-Filtered Moving Average FX

ID: `fx-hp-filter-ma`
Family: FX
Retail feasibility: **B**
As of: 2026-11-27
Bead: `bkt-q5moa.15`
Origin: Kakushadze-Serur

## Logic

Smooth the exchange rate with a Hodrick-Prescott filter, then trade a moving-average crossover on the filtered series.

## Source

1. Kakushadze and Serur, 151 Trading Strategies, section 8.1. https://doi.org/10.1007/978-3-030-02792-6 (Crossref DOI, fetched 2026-11-27); Spanish edition arXiv 1912.04492 (arXiv API, fetched 2026-11-27)
2. A Momentum Trading Strategy Based on the Low Frequency
Component of the Exchange Rate. Harris, Yilmaz, 2008, Crossref. https://doi.org/10.2139/ssrn.1259661 (Crossref search, fetched 2026-11-27)

## Claimed Edge

The book cites Harris and Yilmaz 2009, who found HP filtering improved moving-average FX rules.

## Post-Publication Decay

No fetched post-publication study for this strategy. Grade C.

## Capacity

Large.

## Data Needed

[D-market](../../03-data-sources/cards/D-market.md)

## Implementation

No open-source implementation in `code/`.

Grades: A retail with free data and a small account; B retail with paid data, margin or more capital; C edge thin after retail costs or needs low latency; D institutional balance sheet or access; F closed or not feasible.
