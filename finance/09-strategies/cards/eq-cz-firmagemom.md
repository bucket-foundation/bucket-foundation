# Firm Age - Momentum

ID: `eq-cz-firmagemom`
Family: Equities
Retail feasibility: **B**
As of: 2026-11-27
Bead: `bkt-q5moa.15`
Origin: Chen-Zimmermann

## Logic

Signal: Firm Age - Momentum. Buy the stocks with the highest values and short the lowest, 20 percent tails, EW weights, rebalanced every 1 months. 6 month return, restricted to the bottom quintile of the cross-sectional firm age distribution.

## Source

1. Information Uncertainty and Stock Returns. Zhang, 2004, Crossref. https://doi.org/10.2139/ssrn.535783 (Crossref search, fetched 2026-11-27)
2. Chen and Zimmermann, Open Source Asset Pricing SignalDoc.csv, release 2026.10. https://huggingface.co/datasets/OpenSourceAP/CrossSection (web fetch, fetched 2026-11-27)

## Claimed Edge

Original paper, sample 1983 to 2001: long-short 2.90 percent a month, t-stat 7.21. Chen-Zimmermann class: predictor, predictability in original paper clear.

## Post-Publication Decay

Chen-Zimmermann replication: in-sample 2.22 percent a month, t 5.8; after publication 0.82 percent, t 2.5, 37 percent of in-sample; 2016 to 2025 0.95 percent, t 2.1.

Decay source: Open Source Cross-Sectional Asset Pricing. Chen, Zimmermann, 2020, SSRN Electronic Journal. https://doi.org/10.2139/ssrn.3604626 (Crossref search, fetched 2026-11-27)

## Capacity

Small: equal-weighted sort tilted to microcaps.

## Data Needed

[D-market](../../03-data-sources/cards/D-market.md)

## Implementation

[OpenSourceAP/CrossSection](https://github.com/OpenSourceAP/CrossSection), signal `FirmAgeMom`.

Grades: A retail with free data and a small account; B retail with paid data, margin or more capital; C edge thin after retail costs or needs low latency; D institutional balance sheet or access; F closed or not feasible.
