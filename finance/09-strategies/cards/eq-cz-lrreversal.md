# Long-run reversal

ID: `eq-cz-lrreversal`
Family: Equities
Retail feasibility: **C**
As of: 2026-11-27
Bead: `bkt-q5moa.15`
Origin: Chen-Zimmermann

## Logic

Signal: Long-run reversal. Buy the stocks with the lowest values and short the highest, 20 percent tails, EW weights, rebalanced every 1 months. Stock return between months t-36 and t-13.

## Source

1. Does the Stock Market Overreact?. De BONDT, THALER, 1985, The Journal of Finance. https://doi.org/10.1111/j.1540-6261.1985.tb05004.x (Crossref search, fetched 2026-11-27)
2. Chen and Zimmermann, Open Source Asset Pricing SignalDoc.csv, release 2026.10. https://huggingface.co/datasets/OpenSourceAP/CrossSection (web fetch, fetched 2026-11-27)

## Claimed Edge

Original paper, sample 1929 to 1982: long-short 0.10 percent a month, t-stat 3.29. Chen-Zimmermann class: predictor, predictability in original paper clear.

## Post-Publication Decay

Chen-Zimmermann replication: in-sample 0.80 percent a month, t 3.1; after publication 0.46 percent, t 1.9, 57 percent of in-sample; 2016 to 2025 -0.31 percent, t -0.6.

Decay source: Open Source Cross-Sectional Asset Pricing. Chen, Zimmermann, 2020, SSRN Electronic Journal. https://doi.org/10.2139/ssrn.3604626 (Crossref search, fetched 2026-11-27)

## Capacity

Small: equal-weighted sort tilted to microcaps.

## Data Needed

[D-market](../../03-data-sources/cards/D-market.md)

## Implementation

[OpenSourceAP/CrossSection](https://github.com/OpenSourceAP/CrossSection), signal `LRreversal`.

Grades: A retail with free data and a small account; B retail with paid data, margin or more capital; C edge thin after retail costs or needs low latency; D institutional balance sheet or access; F closed or not feasible.
