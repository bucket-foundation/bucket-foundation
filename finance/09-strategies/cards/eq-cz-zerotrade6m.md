# Days with zero trades

ID: `eq-cz-zerotrade6m`
Family: Equities
Retail feasibility: **C**
As of: 2026-11-27
Bead: `bkt-q5moa.15`
Origin: Chen-Zimmermann

## Logic

Signal: Days with zero trades. Buy the stocks with the highest values and short the lowest, 10 percent tails, EW weights, rebalanced every 1 months. In each month, count the number of days with no trades.

## Source

1. A liquidity-augmented capital asset pricing model. Liu, 2006, Journal of Financial Economics. https://doi.org/10.1016/j.jfineco.2005.10.001 (Crossref search, fetched 2026-11-27)
2. Chen and Zimmermann, Open Source Asset Pricing SignalDoc.csv, release 2026.10. https://huggingface.co/datasets/OpenSourceAP/CrossSection (web fetch, fetched 2026-11-27)

## Claimed Edge

Original paper, sample 1960 to 2003: long-short 0.81 percent a month, t-stat 4.06. Chen-Zimmermann class: predictor, predictability in original paper clear.

## Post-Publication Decay

Chen-Zimmermann replication: in-sample 0.61 percent a month, t 3.3; after publication 0.21 percent, t 0.5, 34 percent of in-sample; 2016 to 2025 -0.28 percent, t -0.5.

Decay source: Open Source Cross-Sectional Asset Pricing. Chen, Zimmermann, 2020, SSRN Electronic Journal. https://doi.org/10.2139/ssrn.3604626 (Crossref search, fetched 2026-11-27)

## Capacity

Small: equal-weighted sort tilted to microcaps.

## Data Needed

[D-market](../../03-data-sources/cards/D-market.md)

## Implementation

[OpenSourceAP/CrossSection](https://github.com/OpenSourceAP/CrossSection), signal `zerotrade6M`.

## Merged Duplicates

- zerotrade1M
- zerotrade12M

Grades: A retail with free data and a small account; B retail with paid data, margin or more capital; C edge thin after retail costs or needs low latency; D institutional balance sheet or access; F closed or not feasible.
