# Decline in Analyst Coverage

ID: `eq-cz-chnanalyst`
Family: Equities
Retail feasibility: **F**
As of: 2026-11-27
Bead: `bkt-q5moa.15`
Origin: Chen-Zimmermann

## Logic

Signal: Decline in Analyst Coverage. Buy the stocks with the lowest values and short the highest, 20 percent tails, VW weights, rebalanced every 1 months. Using IBES forecasts, keep if fpi = 1, fpedats not missing, and fpedats > statpers + 30.

## Source

1. Analyst Disagreement, Forecast Bias and Stock Returns. Scherbina, 2006, Crossref. https://doi.org/10.2139/ssrn.894381 (Crossref search, fetched 2026-11-27)
2. Chen and Zimmermann, Open Source Asset Pricing SignalDoc.csv, release 2026.10. https://huggingface.co/datasets/OpenSourceAP/CrossSection (web fetch, fetched 2026-11-27)

## Claimed Edge

Original paper, sample 1982 to 2005: long-short 0.46 percent a month, t-stat 3.34. Chen-Zimmermann class: predictor, predictability in original paper clear.

## Post-Publication Decay

Chen-Zimmermann replication: in-sample 0.61 percent a month, t 2.0; after publication 0.03 percent, t 0.2, 6 percent of in-sample; 2016 to 2025 -0.01 percent, t -0.0.

Decay source: Open Source Cross-Sectional Asset Pricing. Chen, Zimmermann, 2020, SSRN Electronic Journal. https://doi.org/10.2139/ssrn.3604626 (Crossref search, fetched 2026-11-27)

## Capacity

Large: value-weighted sort.

## Data Needed

[D-filings](../../03-data-sources/cards/D-filings.md), [D-market](../../03-data-sources/cards/D-market.md)

## Implementation

[OpenSourceAP/CrossSection](https://github.com/OpenSourceAP/CrossSection), signal `ChNAnalyst`.

Grades: A retail with free data and a small account; B retail with paid data, margin or more capital; C edge thin after retail costs or needs low latency; D institutional balance sheet or access; F closed or not feasible.
