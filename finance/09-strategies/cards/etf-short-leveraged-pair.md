# Short Leveraged ETF Pairs

ID: `etf-short-leveraged-pair`
Family: ETFs and Macro
Retail feasibility: **C**
As of: 2026-11-27
Bead: `bkt-q5moa.15`
Origin: Kakushadze-Serur

## Logic

Short both the bull and the bear leveraged ETF on the same index to collect the volatility decay that daily rebalancing causes.

## Source

1. Kakushadze and Serur, 151 Trading Strategies, section 4.5. https://doi.org/10.1007/978-3-030-02792-6 (Crossref DOI, fetched 2026-11-27); Spanish edition arXiv 1912.04492 (arXiv API, fetched 2026-11-27)

## Claimed Edge

Daily reset makes leveraged ETFs lose value in volatile flat markets. Borrow cost and squeeze risk remain.

## Post-Publication Decay

No fetched post-publication study for this strategy. Grade C.

## Capacity

Medium.

## Data Needed

[D-market](../../03-data-sources/cards/D-market.md)

## Implementation

No open-source implementation in `code/`.

## Merged Duplicates

- code QuantConnect/Lean: Algorithm.Python/Alphas/TripleLeverageETFPairVolatilityDecayAlpha.py

Grades: A retail with free data and a small account; B retail with paid data, margin or more capital; C edge thin after retail costs or needs low latency; D institutional balance sheet or access; F closed or not feasible.
