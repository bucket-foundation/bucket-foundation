# Momentum and LT Reversal

ID: `eq-cz-momrev`
Family: Equities
Retail feasibility: **F**
As of: 2026-11-27
Bead: `bkt-q5moa.15`
Origin: Chen-Zimmermann

## Logic

Signal: Momentum and LT Reversal. Buy the stocks with the highest values and short the lowest, 20 percent tails, EW weights, rebalanced every 3 months. Binary variable equal to 1 if firm is in the highest Mom6m quintile and the lowest Mom36m quintile, and equal to 0 if firm is in the lowest Mom6m quintile and the highest Mom36m quintile.

## Source

1. Chan and Ko 2006, JOIM. Paper not resolved on Crossref; citation from SignalDoc.
2. Chen and Zimmermann, Open Source Asset Pricing SignalDoc.csv, release 2026.10. https://huggingface.co/datasets/OpenSourceAP/CrossSection (web fetch, fetched 2026-11-27)

## Claimed Edge

Original paper, sample 1965 to 2001: long-short 0.48 percent a month, t-stat 4.29. Chen-Zimmermann class: predictor, predictability in original paper clear.

## Post-Publication Decay

Chen-Zimmermann replication: in-sample 1.17 percent a month, t 4.3; after publication 0.03 percent, t 0.1, 2 percent of in-sample; 2016 to 2025 0.54 percent, t 0.8.

Decay source: Open Source Cross-Sectional Asset Pricing. Chen, Zimmermann, 2020, SSRN Electronic Journal. https://doi.org/10.2139/ssrn.3604626 (Crossref search, fetched 2026-11-27)

## Capacity

Small: equal-weighted sort tilted to microcaps.

## Data Needed

[D-market](../../03-data-sources/cards/D-market.md)

## Implementation

[OpenSourceAP/CrossSection](https://github.com/OpenSourceAP/CrossSection), signal `MomRev`.

Grades: A retail with free data and a small account; B retail with paid data, margin or more capital; C edge thin after retail costs or needs low latency; D institutional balance sheet or access; F closed or not feasible.
