# Momentum in high volume stocks

ID: `eq-cz-momvol`
Family: Equities
Retail feasibility: **B**
As of: 2026-11-27
Bead: `bkt-q5moa.15`
Origin: Chen-Zimmermann

## Logic

Signal: Momentum in high volume stocks. Buy the stocks with the highest values and short the lowest, 20 percent tails, EW weights, rebalanced every 3 months. Define momentum as Mom6m, and volume as the rolling average of the past 6 months of monthly turnover (minimum 5 months).

## Source

1. Price Momentum and Trading Volume. Lee, Swaminathan, 1998, Crossref. https://doi.org/10.2139/ssrn.92589 (Crossref search, fetched 2026-11-27)
2. Chen and Zimmermann, Open Source Asset Pricing SignalDoc.csv, release 2026.10. https://huggingface.co/datasets/OpenSourceAP/CrossSection (web fetch, fetched 2026-11-27)

## Claimed Edge

Original paper, sample 1965 to 1995: long-short 1.55 percent a month, t-stat 5.78. Chen-Zimmermann class: predictor, predictability in original paper clear.

## Post-Publication Decay

Chen-Zimmermann replication: in-sample 1.63 percent a month, t 5.1; after publication 1.29 percent, t 2.1, 79 percent of in-sample; 2016 to 2025 2.99 percent, t 3.5.

Decay source: Open Source Cross-Sectional Asset Pricing. Chen, Zimmermann, 2020, SSRN Electronic Journal. https://doi.org/10.2139/ssrn.3604626 (Crossref search, fetched 2026-11-27)

## Capacity

Small: equal-weighted sort tilted to microcaps.

## Data Needed

[D-market](../../03-data-sources/cards/D-market.md)

## Implementation

[OpenSourceAP/CrossSection](https://github.com/OpenSourceAP/CrossSection), signal `MomVol`.

Grades: A retail with free data and a small account; B retail with paid data, margin or more capital; C edge thin after retail costs or needs low latency; D institutional balance sheet or access; F closed or not feasible.
