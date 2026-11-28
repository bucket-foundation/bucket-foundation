# Government Bond Value

ID: `rt-bond-value`
Family: Rates
Retail feasibility: **B**
As of: 2026-11-27
Bead: `bkt-q5moa.15`
Origin: Kakushadze-Serur

## Logic

Buy country bonds whose real yield or yield over a fair-value model is highest, sell the lowest.

## Source

1. Kakushadze and Serur, 151 Trading Strategies, section 5.10. https://doi.org/10.1007/978-3-030-02792-6 (Crossref DOI, fetched 2026-11-27); Spanish edition arXiv 1912.04492 (arXiv API, fetched 2026-11-27)
2. Value and Momentum Everywhere. Asness and co-authors, 2012, Crossref. https://doi.org/10.2139/ssrn.2174501 (Crossref search, fetched 2026-11-27)

## Claimed Edge

The book cites Asness, Moskowitz and Pedersen 2013, who found value pays across country bonds.

## Post-Publication Decay

No fetched post-publication study for this strategy. Grade C.

## Capacity

Large.

## Data Needed

[D-macro](../../03-data-sources/cards/D-macro.md)

## Implementation

No open-source implementation in `code/`.

Grades: A retail with free data and a small account; B retail with paid data, margin or more capital; C edge thin after retail costs or needs low latency; D institutional balance sheet or access; F closed or not feasible.
