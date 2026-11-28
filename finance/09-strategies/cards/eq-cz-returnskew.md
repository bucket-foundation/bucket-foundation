# Return skewness

ID: `eq-cz-returnskew`
Family: Equities
Retail feasibility: **C**
As of: 2026-11-27
Bead: `bkt-q5moa.15`
Origin: Chen-Zimmermann

## Logic

Signal: Return skewness. Buy the stocks with the lowest values and short the highest, 20 percent tails, EW weights, rebalanced every 1 months. Skewness of daily returns (ret) over previous month.

## Source

1. Empirical Asset Pricing: The Cross Section of Stock Returns: An Overview. Bali and co-authors, 2017, Wiley StatsRef: Statistics Reference Online. https://doi.org/10.1002/9781118445112.stat07954 (Crossref search, fetched 2026-11-27)
2. Chen and Zimmermann, Open Source Asset Pricing SignalDoc.csv, release 2026.10. https://huggingface.co/datasets/OpenSourceAP/CrossSection (web fetch, fetched 2026-11-27)

## Claimed Edge

Original paper, sample 1963 to 2012: long-short 0.47 percent a month, t-stat 4.01. Chen-Zimmermann class: predictor, predictability in original paper clear.

## Post-Publication Decay

Chen-Zimmermann replication: in-sample 0.43 percent a month, t 5.6; after publication 0.28 percent, t 1.3, 64 percent of in-sample; 2016 to 2025 0.28 percent, t 1.3.

Decay source: Open Source Cross-Sectional Asset Pricing. Chen, Zimmermann, 2020, SSRN Electronic Journal. https://doi.org/10.2139/ssrn.3604626 (Crossref search, fetched 2026-11-27)

## Capacity

Small: equal-weighted sort tilted to microcaps.

## Data Needed

[D-market](../../03-data-sources/cards/D-market.md)

## Implementation

[OpenSourceAP/CrossSection](https://github.com/OpenSourceAP/CrossSection), signal `ReturnSkew`.

## Merged Duplicates

- ReturnSkew3F
- ReturnSkewCAPM
- ReturnSkewQF

Grades: A retail with free data and a small account; B retail with paid data, margin or more capital; C edge thin after retail costs or needs low latency; D institutional balance sheet or access; F closed or not feasible.
