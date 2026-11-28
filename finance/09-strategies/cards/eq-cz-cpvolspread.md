# Call minus Put Vol

ID: `eq-cz-cpvolspread`
Family: Equities
Retail feasibility: **A**
As of: 2026-11-27
Bead: `bkt-q5moa.15`
Origin: Chen-Zimmermann

## Logic

Signal: Call minus Put Vol. Buy the stocks with the highest values and short the lowest, 20 percent tails, VW weights, rebalanced every 1 months. ATM Call vol minus ATM put vol

## Source

1. Volatility Spreads and Expected Stock Returns. Bali, Hovakimian, 2007, Crossref. https://doi.org/10.2139/ssrn.1029197 (Crossref search, fetched 2026-11-27)
2. Chen and Zimmermann, Open Source Asset Pricing SignalDoc.csv, release 2026.10. https://huggingface.co/datasets/OpenSourceAP/CrossSection (web fetch, fetched 2026-11-27)

## Claimed Edge

Original paper, sample 1996 to 2004: long-short 1.04 percent a month, t-stat 4.2. Chen-Zimmermann class: predictor, predictability in original paper clear.

## Post-Publication Decay

Chen-Zimmermann replication: in-sample 0.98 percent a month, t 3.2; after publication 0.47 percent, t 3.3, 48 percent of in-sample; 2016 to 2025 0.26 percent, t 1.2.

Decay source: Open Source Cross-Sectional Asset Pricing. Chen, Zimmermann, 2020, SSRN Electronic Journal. https://doi.org/10.2139/ssrn.3604626 (Crossref search, fetched 2026-11-27)

## Capacity

Large: value-weighted sort.

## Data Needed

[D-market](../../03-data-sources/cards/D-market.md)

## Implementation

[OpenSourceAP/CrossSection](https://github.com/OpenSourceAP/CrossSection), signal `CPVolSpread`.

Grades: A retail with free data and a small account; B retail with paid data, margin or more capital; C edge thin after retail costs or needs low latency; D institutional balance sheet or access; F closed or not feasible.
