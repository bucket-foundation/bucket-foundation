# Analyst Value

ID: `eq-cz-analystvalue`
Family: Equities
Retail feasibility: **C**
As of: 2026-11-27
Bead: `bkt-q5moa.15`
Origin: Chen-Zimmermann

## Logic

Signal: Analyst Value. Buy the stocks with the highest values and short the lowest, 20 percent tails, EW weights, rebalanced every 12 months. Value based on a three-stage dividend discount model and analyst forecasts, scaled by market value.

## Source

1. Accounting valuation, market expectation, and cross-sectional stock returns. Frankel, Lee, 1998, Journal of Accounting and Economics. https://doi.org/10.1016/s0165-4101(98)00026-3 (Crossref search, fetched 2026-11-27)
2. Chen and Zimmermann, Open Source Asset Pricing SignalDoc.csv, release 2026.10. https://huggingface.co/datasets/OpenSourceAP/CrossSection (web fetch, fetched 2026-11-27)

## Claimed Edge

Original paper, sample 1975 to 1993: long-short 0.26 percent a month, t-stat. Chen-Zimmermann class: predictor, predictability in original paper likely.

## Post-Publication Decay

Chen-Zimmermann replication: in-sample 0.22 percent a month, t 1.5; after publication 0.33 percent, t 1.1, 149 percent of in-sample; 2016 to 2025 0.14 percent, t 0.3.

Decay source: Open Source Cross-Sectional Asset Pricing. Chen, Zimmermann, 2020, SSRN Electronic Journal. https://doi.org/10.2139/ssrn.3604626 (Crossref search, fetched 2026-11-27)

## Capacity

Small: equal-weighted sort tilted to microcaps.

## Data Needed

[D-filings](../../03-data-sources/cards/D-filings.md), [D-market](../../03-data-sources/cards/D-market.md)

## Implementation

[OpenSourceAP/CrossSection](https://github.com/OpenSourceAP/CrossSection), signal `AnalystValue`.

Grades: A retail with free data and a small account; B retail with paid data, margin or more capital; C edge thin after retail costs or needs low latency; D institutional balance sheet or access; F closed or not feasible.
