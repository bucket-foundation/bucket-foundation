# Junk Stock Momentum

ID: `eq-cz-mom6mjunk`
Family: Equities
Retail feasibility: **C**
As of: 2026-11-27
Bead: `bkt-q5moa.15`
Origin: Chen-Zimmermann

## Logic

Signal: Junk Stock Momentum. Buy the stocks with the highest values and short the lowest, 10 percent tails, EW weights, rebalanced every 1 months. Mom6m.

## Source

1. Momentum and Credit Rating. AVRAMOV and co-authors, 2007, The Journal of Finance. https://doi.org/10.1111/j.1540-6261.2007.01282.x (Crossref search, fetched 2026-11-27)
2. Chen and Zimmermann, Open Source Asset Pricing SignalDoc.csv, release 2026.10. https://huggingface.co/datasets/OpenSourceAP/CrossSection (web fetch, fetched 2026-11-27)

## Claimed Edge

Original paper, sample 1985 to 2003: long-short 2.12 percent a month, t-stat 4.29. Chen-Zimmermann class: predictor, predictability in original paper clear.

## Post-Publication Decay

Chen-Zimmermann replication: in-sample 2.05 percent a month, t 4.2; after publication 0.55 percent, t 1.1, 27 percent of in-sample; 2016 to 2025 1.00 percent, t 1.6.

Decay source: Open Source Cross-Sectional Asset Pricing. Chen, Zimmermann, 2020, SSRN Electronic Journal. https://doi.org/10.2139/ssrn.3604626 (Crossref search, fetched 2026-11-27)

## Capacity

Small: equal-weighted sort tilted to microcaps.

## Data Needed

[D-market](../../03-data-sources/cards/D-market.md)

## Implementation

[OpenSourceAP/CrossSection](https://github.com/OpenSourceAP/CrossSection), signal `Mom6mJunk`.

Grades: A retail with free data and a small account; B retail with paid data, margin or more capital; C edge thin after retail costs or needs low latency; D institutional balance sheet or access; F closed or not feasible.
