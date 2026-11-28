# Momentum without the seasonal part

ID: `eq-cz-mom12moffseason`
Family: Equities
Retail feasibility: **C**
As of: 2026-11-27
Bead: `bkt-q5moa.15`
Origin: Chen-Zimmermann

## Logic

Signal: Momentum without the seasonal part. Buy the stocks with the highest values and short the lowest, 10 percent tails, EW weights, rebalanced every 1 months. Average return in other months over the previous year.

## Source

1. Seasonality in the cross-section of stock returns☆. HESTON, SADKA, 2008, Journal of Financial Economics. https://doi.org/10.1016/j.jfineco.2007.02.003 (Crossref search, fetched 2026-11-27)
2. Chen and Zimmermann, Open Source Asset Pricing SignalDoc.csv, release 2026.10. https://huggingface.co/datasets/OpenSourceAP/CrossSection (web fetch, fetched 2026-11-27)

## Claimed Edge

Original paper, sample 1965 to 2002: long-short 1.17 percent a month, t-stat 4.2. Chen-Zimmermann class: predictor, predictability in original paper clear.

## Post-Publication Decay

Chen-Zimmermann replication: in-sample 1.29 percent a month, t 4.3; after publication 0.94 percent, t 1.6, 73 percent of in-sample; 2016 to 2025 1.43 percent, t 2.1.

Decay source: Open Source Cross-Sectional Asset Pricing. Chen, Zimmermann, 2020, SSRN Electronic Journal. https://doi.org/10.2139/ssrn.3604626 (Crossref search, fetched 2026-11-27)

## Capacity

Small: equal-weighted sort tilted to microcaps.

## Data Needed

[D-market](../../03-data-sources/cards/D-market.md)

## Implementation

[OpenSourceAP/CrossSection](https://github.com/OpenSourceAP/CrossSection), signal `Mom12mOffSeason`.

Grades: A retail with free data and a small account; B retail with paid data, margin or more capital; C edge thin after retail costs or needs low latency; D institutional balance sheet or access; F closed or not feasible.
