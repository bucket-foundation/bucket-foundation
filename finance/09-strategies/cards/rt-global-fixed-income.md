# Global Fixed Income Macro

ID: `rt-global-fixed-income`
Family: Rates
Retail feasibility: **B**
As of: 2026-11-27
Bead: `bkt-q5moa.15`
Origin: Kakushadze-Serur

## Logic

Rank country bond markets on value, momentum, carry and macro signals; buy the top and sell the bottom duration-neutral.

## Source

1. Kakushadze and Serur, 151 Trading Strategies, section 19.4. https://doi.org/10.1007/978-3-030-02792-6 (Crossref DOI, fetched 2026-11-27); Spanish edition arXiv 1912.04492 (arXiv API, fetched 2026-11-27)

## Claimed Edge

The book cites Brooks and Moskowitz 2017 on value, momentum and carry in country bonds.

## Post-Publication Decay

No fetched post-publication study for this strategy. Grade C.

## Capacity

Large.

## Data Needed

[D-macro](../../03-data-sources/cards/D-macro.md), [D-market](../../03-data-sources/cards/D-market.md)

## Implementation

No open-source implementation in `code/`.

Grades: A retail with free data and a small account; B retail with paid data, margin or more capital; C edge thin after retail costs or needs low latency; D institutional balance sheet or access; F closed or not feasible.
