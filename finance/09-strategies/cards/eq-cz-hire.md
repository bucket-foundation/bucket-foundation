# Employment growth

ID: `eq-cz-hire`
Family: Equities
Retail feasibility: **F**
As of: 2026-11-27
Bead: `bkt-q5moa.15`
Origin: Chen-Zimmermann

## Logic

Signal: Employment growth. Buy the stocks with the lowest values and short the highest, 20 percent tails, EW weights, rebalanced every 12 months. Change in number of employees (emp) between t -1 and t, scaled by average number of employees in t-1 and t.

## Source

1. Labor Hiring, Investment, and Stock Return Predictability in the Cross Section. Belo and co-authors, 2014, Journal of Political Economy. https://doi.org/10.1086/674549 (Crossref search, fetched 2026-11-27)
2. Chen and Zimmermann, Open Source Asset Pricing SignalDoc.csv, release 2026.10. https://huggingface.co/datasets/OpenSourceAP/CrossSection (web fetch, fetched 2026-11-27)

## Claimed Edge

Original paper, sample 1965 to 2010: long-short 0.87 percent a month, t-stat 5.78. Chen-Zimmermann class: predictor, predictability in original paper clear.

## Post-Publication Decay

Chen-Zimmermann replication: in-sample 0.51 percent a month, t 5.6; after publication 0.09 percent, t 0.4, 17 percent of in-sample; 2016 to 2025 0.15 percent, t 0.7.

Decay source: Open Source Cross-Sectional Asset Pricing. Chen, Zimmermann, 2020, SSRN Electronic Journal. https://doi.org/10.2139/ssrn.3604626 (Crossref search, fetched 2026-11-27)

## Capacity

Small: equal-weighted sort tilted to microcaps.

## Data Needed

[D-filings](../../03-data-sources/cards/D-filings.md), [D-market](../../03-data-sources/cards/D-market.md)

## Implementation

[OpenSourceAP/CrossSection](https://github.com/OpenSourceAP/CrossSection), signal `hire`.

Grades: A retail with free data and a small account; B retail with paid data, margin or more capital; C edge thin after retail costs or needs low latency; D institutional balance sheet or access; F closed or not feasible.
