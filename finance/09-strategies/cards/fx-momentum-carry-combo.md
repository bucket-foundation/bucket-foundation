# FX Momentum and Carry Combination

ID: `fx-momentum-carry-combo`
Family: FX
Retail feasibility: **B**
As of: 2026-11-27
Bead: `bkt-q5moa.15`
Origin: Kakushadze-Serur

## Logic

Rank currencies on a blend of carry and past return, buy the top and sell the bottom.

## Source

1. Kakushadze and Serur, 151 Trading Strategies, section 8.4. https://doi.org/10.1007/978-3-030-02792-6 (Crossref DOI, fetched 2026-11-27); Spanish edition arXiv 1912.04492 (arXiv API, fetched 2026-11-27)
2. Strategy diversification: Combining momentum and carry strategies within a foreign exchange portfolio. Olszweski, Zhou, 2013, Journal of Derivatives &amp; Hedge Funds. https://doi.org/10.1057/jdhf.2013.16 (Crossref search, fetched 2026-11-27)

## Claimed Edge

The book cites Olszweski and Zhou 2013 on combining the two FX premia.

## Post-Publication Decay

No fetched post-publication study for this strategy. Grade C.

## Capacity

Large.

## Data Needed

[D-market](../../03-data-sources/cards/D-market.md), [D-macro](../../03-data-sources/cards/D-macro.md)

## Implementation

No open-source implementation in `code/`.

Grades: A retail with free data and a small account; B retail with paid data, margin or more capital; C edge thin after retail costs or needs low latency; D institutional balance sheet or access; F closed or not feasible.
