# Trend Factor

ID: `eq-cz-trendfactor`
Family: Equities
Retail feasibility: **C**
As of: 2026-11-27
Bead: `bkt-q5moa.15`
Origin: Chen-Zimmermann

## Logic

Signal: Trend Factor. Buy the stocks with the highest values and short the lowest, 20 percent tails, EW weights, rebalanced every 1 months. See paper section 2.1 and 2.2

## Source

1. A trend factor: Any economic gains from using information over investment horizons?. Han and co-authors, 2016, Journal of Financial Economics. https://doi.org/10.1016/j.jfineco.2016.01.029 (Crossref search, fetched 2026-11-27)
2. Chen and Zimmermann, Open Source Asset Pricing SignalDoc.csv, release 2026.10. https://huggingface.co/datasets/OpenSourceAP/CrossSection (web fetch, fetched 2026-11-27)

## Claimed Edge

Original paper, sample 1930 to 2014: long-short 1.63 percent a month, t-stat 15.0. Chen-Zimmermann class: predictor, predictability in original paper clear.

## Post-Publication Decay

Chen-Zimmermann replication: in-sample 1.74 percent a month, t 13.4; after publication 0.42 percent, t 1.2, 24 percent of in-sample; 2016 to 2025 0.38 percent, t 1.2.

Decay source: Open Source Cross-Sectional Asset Pricing. Chen, Zimmermann, 2020, SSRN Electronic Journal. https://doi.org/10.2139/ssrn.3604626 (Crossref search, fetched 2026-11-27)

## Capacity

Small: equal-weighted sort tilted to microcaps.

## Data Needed

[D-market](../../03-data-sources/cards/D-market.md)

## Implementation

[OpenSourceAP/CrossSection](https://github.com/OpenSourceAP/CrossSection), signal `TrendFactor`.

Grades: A retail with free data and a small account; B retail with paid data, margin or more capital; C edge thin after retail costs or needs low latency; D institutional balance sheet or access; F closed or not feasible.
