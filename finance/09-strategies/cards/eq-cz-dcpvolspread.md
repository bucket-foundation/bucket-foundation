# Change in put vol minus change in call vol

ID: `eq-cz-dcpvolspread`
Family: Equities
Retail feasibility: **B**
As of: 2026-11-27
Bead: `bkt-q5moa.15`
Origin: Chen-Zimmermann

## Logic

Signal: Change in put vol minus change in call vol. Buy the stocks with the lowest values and short the highest, 10 percent tails, EW weights, rebalanced every 1 months. Take difference of dVolCall and dVolPut

## Source

1. The Joint Cross Section of Stocks and Options. AN and co-authors, 2014, The Journal of Finance. https://doi.org/10.1111/jofi.12181 (Crossref search, fetched 2026-11-27)
2. Chen and Zimmermann, Open Source Asset Pricing SignalDoc.csv, release 2026.10. https://huggingface.co/datasets/OpenSourceAP/CrossSection (web fetch, fetched 2026-11-27)

## Claimed Edge

Original paper, sample 1996 to 2011: long-short 1.68 percent a month, t-stat 6.77. Chen-Zimmermann class: predictor, predictability in original paper clear.

## Post-Publication Decay

Chen-Zimmermann replication: in-sample 1.36 percent a month, t 7.5; after publication 0.69 percent, t 3.5, 51 percent of in-sample; 2016 to 2025 0.63 percent, t 3.0.

Decay source: Open Source Cross-Sectional Asset Pricing. Chen, Zimmermann, 2020, SSRN Electronic Journal. https://doi.org/10.2139/ssrn.3604626 (Crossref search, fetched 2026-11-27)

## Capacity

Small: equal-weighted sort tilted to microcaps.

## Data Needed

[D-market](../../03-data-sources/cards/D-market.md)

## Implementation

[OpenSourceAP/CrossSection](https://github.com/OpenSourceAP/CrossSection), signal `dCPVolSpread`.

Grades: A retail with free data and a small account; B retail with paid data, margin or more capital; C edge thin after retail costs or needs low latency; D institutional balance sheet or access; F closed or not feasible.
