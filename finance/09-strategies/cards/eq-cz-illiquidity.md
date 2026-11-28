# Amihud's illiquidity

ID: `eq-cz-illiquidity`
Family: Equities
Retail feasibility: **F**
As of: 2026-11-27
Bead: `bkt-q5moa.15`
Origin: Chen-Zimmermann

## Logic

Signal: Amihud's illiquidity. Buy the stocks with the highest values and short the lowest, 20 percent tails, EW weights, rebalanced every 12 months. Past twelve month average of: daily return (abs(ret)) divided by turnover((abs(prc)*vol)

## Source

1. Illiquidity and stock returns: cross-section and time-series effects. Amihud, 2002, Journal of Financial Markets. https://doi.org/10.1016/s1386-4181(01)00024-6 (Crossref search, fetched 2026-11-27)
2. Chen and Zimmermann, Open Source Asset Pricing SignalDoc.csv, release 2026.10. https://huggingface.co/datasets/OpenSourceAP/CrossSection (web fetch, fetched 2026-11-27)

## Claimed Edge

Original paper, sample 1964 to 1997: t=6.6 in univariate reg. Chen-Zimmermann class: predictor, predictability in original paper clear.

## Post-Publication Decay

Chen-Zimmermann replication: in-sample 0.39 percent a month, t 2.8; after publication 0.05 percent, t 0.4, 12 percent of in-sample; 2016 to 2025 -0.07 percent, t -0.5.

Decay source: Open Source Cross-Sectional Asset Pricing. Chen, Zimmermann, 2020, SSRN Electronic Journal. https://doi.org/10.2139/ssrn.3604626 (Crossref search, fetched 2026-11-27)

## Capacity

Small: equal-weighted sort tilted to microcaps.

## Data Needed

[D-market](../../03-data-sources/cards/D-market.md)

## Implementation

[OpenSourceAP/CrossSection](https://github.com/OpenSourceAP/CrossSection), signal `Illiquidity`.

Grades: A retail with free data and a small account; B retail with paid data, margin or more capital; C edge thin after retail costs or needs low latency; D institutional balance sheet or access; F closed or not feasible.
