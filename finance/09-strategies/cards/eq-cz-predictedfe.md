# Predicted Analyst forecast error

ID: `eq-cz-predictedfe`
Family: Equities
Retail feasibility: **F**
As of: 2026-11-27
Bead: `bkt-q5moa.15`
Origin: Chen-Zimmermann

## Logic

Signal: Predicted Analyst forecast error. Buy the stocks with the lowest values and short the highest, 20 percent tails, EW weights, rebalanced every 12 months. The fitted value from cross-sectional regressions of analyst earnings' forecast errors on cross-sectional rankings of 5-year sales growth, book-to-market, AOP, and analyst long term growth.

## Source

1. Accounting valuation, market expectation, and cross-sectional stock returns. Frankel, Lee, 1998, Journal of Accounting and Economics. https://doi.org/10.1016/s0165-4101(98)00026-3 (Crossref search, fetched 2026-11-27)
2. Chen and Zimmermann, Open Source Asset Pricing SignalDoc.csv, release 2026.10. https://huggingface.co/datasets/OpenSourceAP/CrossSection (web fetch, fetched 2026-11-27)

## Claimed Edge

Original paper, sample 1979 to 1993: p<0.01 in reg but nonstandard stats. Chen-Zimmermann class: predictor, predictability in original paper likely.

## Post-Publication Decay

Chen-Zimmermann replication: in-sample 0.39 percent a month, t 1.2; after publication -0.02 percent, t -0.1, -6 percent of in-sample; 2016 to 2025 -0.04 percent, t -0.2.

Decay source: Open Source Cross-Sectional Asset Pricing. Chen, Zimmermann, 2020, SSRN Electronic Journal. https://doi.org/10.2139/ssrn.3604626 (Crossref search, fetched 2026-11-27)

## Capacity

Small: equal-weighted sort tilted to microcaps.

## Data Needed

[D-filings](../../03-data-sources/cards/D-filings.md), [D-market](../../03-data-sources/cards/D-market.md)

## Implementation

[OpenSourceAP/CrossSection](https://github.com/OpenSourceAP/CrossSection), signal `PredictedFE`.

Grades: A retail with free data and a small account; B retail with paid data, margin or more capital; C edge thin after retail costs or needs low latency; D institutional balance sheet or access; F closed or not feasible.
