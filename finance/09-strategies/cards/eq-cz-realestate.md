# Real estate holdings

ID: `eq-cz-realestate`
Family: Equities
Retail feasibility: **C**
As of: 2026-11-27
Bead: `bkt-q5moa.15`
Origin: Chen-Zimmermann

## Logic

Signal: Real estate holdings. Buy the stocks with the highest values and short the lowest, 20 percent tails, VW weights, rebalanced every 12 months. Industry-adjusted value of real estate holdings.

## Source

1. Corporate Real Estate Holdings and the Cross Section of Stock Returns. Tuzel, 2009, SSRN Electronic Journal. https://doi.org/10.2139/ssrn.685642 (Crossref search, fetched 2026-11-27)
2. Chen and Zimmermann, Open Source Asset Pricing SignalDoc.csv, release 2026.10. https://huggingface.co/datasets/OpenSourceAP/CrossSection (web fetch, fetched 2026-11-27)

## Claimed Edge

Original paper, sample 1971 to 2005: long-short 0.24 percent a month, t-stat 1.8. Chen-Zimmermann class: predictor, predictability in original paper likely.

## Post-Publication Decay

Chen-Zimmermann replication: in-sample 0.28 percent a month, t 1.8; after publication 0.24 percent, t 1.1, 84 percent of in-sample; 2016 to 2025 0.16 percent, t 0.5.

Decay source: Open Source Cross-Sectional Asset Pricing. Chen, Zimmermann, 2020, SSRN Electronic Journal. https://doi.org/10.2139/ssrn.3604626 (Crossref search, fetched 2026-11-27)

## Capacity

Large: value-weighted sort.

## Data Needed

[D-filings](../../03-data-sources/cards/D-filings.md), [D-market](../../03-data-sources/cards/D-market.md)

## Implementation

[OpenSourceAP/CrossSection](https://github.com/OpenSourceAP/CrossSection), signal `realestate`.

Grades: A retail with free data and a small account; B retail with paid data, margin or more capital; C edge thin after retail costs or needs low latency; D institutional balance sheet or access; F closed or not feasible.
