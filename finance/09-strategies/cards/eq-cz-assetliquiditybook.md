# Asset liquidity over book assets

ID: `eq-cz-assetliquiditybook`
Family: Equities
Retail feasibility: **F**
As of: 2026-11-27
Bead: `bkt-q5moa.15`
Origin: Chen-Zimmermann

## Logic

Signal: Asset liquidity over book assets. Buy the stocks with the highest values and short the lowest, 20 percent tails, EW weights, rebalanced every 1 months. (assets (at) + 0.75*(at - short term investments(che)) + 0.5*(at- curren total assets (act) - goodwill(gdwl) - intangibles (itan)) scaled by the one-month lagged book assets (at).

## Source

1. Real Asset Illiquidity and the Cost of Capital. Ortiz-Molina, Phillips, 2014, Journal of Financial and Quantitative Analysis. https://doi.org/10.1017/s0022109014000210 (Crossref search, fetched 2026-11-27)
2. Chen and Zimmermann, Open Source Asset Pricing SignalDoc.csv, release 2026.10. https://huggingface.co/datasets/OpenSourceAP/CrossSection (web fetch, fetched 2026-11-27)

## Claimed Edge

Original paper, sample 1984 to 2006: no predictability. Correlated with ICC. Chen-Zimmermann class: placebo, predictability in original paper indirect.

## Post-Publication Decay

Chen-Zimmermann replication: in-sample 0.33 percent a month, t 1.3; after publication 0.07 percent, t 0.2, 21 percent of in-sample; 2016 to 2025 0.02 percent, t 0.1.

Decay source: Open Source Cross-Sectional Asset Pricing. Chen, Zimmermann, 2020, SSRN Electronic Journal. https://doi.org/10.2139/ssrn.3604626 (Crossref search, fetched 2026-11-27)

## Capacity

Large: value-weighted sort.

## Data Needed

[D-filings](../../03-data-sources/cards/D-filings.md), [D-market](../../03-data-sources/cards/D-market.md)

## Implementation

[OpenSourceAP/CrossSection](https://github.com/OpenSourceAP/CrossSection), signal `AssetLiquidityBook`.

## Merged Duplicates

- AssetLiquidityBookQuart
- AssetLiquidityMarket
- AssetLiquidityMarketQuart

Grades: A retail with free data and a small account; B retail with paid data, margin or more capital; C edge thin after retail costs or needs low latency; D institutional balance sheet or access; F closed or not feasible.
