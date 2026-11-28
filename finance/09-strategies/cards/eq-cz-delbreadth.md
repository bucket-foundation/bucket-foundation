# Breadth of ownership

ID: `eq-cz-delbreadth`
Family: Equities
Retail feasibility: **C**
As of: 2026-11-27
Bead: `bkt-q5moa.15`
Origin: Chen-Zimmermann

## Logic

Signal: Breadth of ownership. Buy the stocks with the highest values and short the lowest, 10 percent tails, EW weights, rebalanced every 3 months. Quarterly change in the number of institutional owners (numinstowners) from 13F data.

## Source

1. Breadth of Ownership and Stock Returns. Chen and co-authors, 2001, Crossref. https://doi.org/10.3386/w8151 (Crossref search, fetched 2026-11-27)
2. Chen and Zimmermann, Open Source Asset Pricing SignalDoc.csv, release 2026.10. https://huggingface.co/datasets/OpenSourceAP/CrossSection (web fetch, fetched 2026-11-27)

## Claimed Edge

Original paper, sample 1979 to 1998: long-short 0.67 percent a month, t-stat 3.96. Chen-Zimmermann class: predictor, predictability in original paper clear.

## Post-Publication Decay

Chen-Zimmermann replication: in-sample 0.69 percent a month, t 3.7; after publication 0.32 percent, t 1.5, 46 percent of in-sample; 2016 to 2025 0.51 percent, t 1.5.

Decay source: Open Source Cross-Sectional Asset Pricing. Chen, Zimmermann, 2020, SSRN Electronic Journal. https://doi.org/10.2139/ssrn.3604626 (Crossref search, fetched 2026-11-27)

## Capacity

Small: equal-weighted sort tilted to microcaps.

## Data Needed

[D-filings](../../03-data-sources/cards/D-filings.md), [D-market](../../03-data-sources/cards/D-market.md)

## Implementation

[OpenSourceAP/CrossSection](https://github.com/OpenSourceAP/CrossSection), signal `DelBreadth`.

Grades: A retail with free data and a small account; B retail with paid data, margin or more capital; C edge thin after retail costs or needs low latency; D institutional balance sheet or access; F closed or not feasible.
