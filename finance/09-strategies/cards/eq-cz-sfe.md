# Earnings Forecast to price

ID: `eq-cz-sfe`
Family: Equities
Retail feasibility: **C**
As of: 2026-11-27
Bead: `bkt-q5moa.15`
Origin: Chen-Zimmermann

## Logic

Signal: Earnings Forecast to price. Buy the stocks with the highest values and short the lowest, 10 percent tails, EW weights, rebalanced every 12 months. Median estimate for next year eps (fpi = 1) in March, divided by stock price from December.

## Source

1. Delayed Security Price Adjustments to Financial Analysts' Forecasts of Annual Earnings. Elgers and co-authors, 2001, The Accounting Review. https://doi.org/10.2308/accr.2001.76.4.613 (Crossref search, fetched 2026-11-27)
2. Chen and Zimmermann, Open Source Asset Pricing SignalDoc.csv, release 2026.10. https://huggingface.co/datasets/OpenSourceAP/CrossSection (web fetch, fetched 2026-11-27)

## Claimed Edge

Original paper, sample 1982 to 1998: long-short 1.47 percent a month, t-stat 4.99. Chen-Zimmermann class: predictor, predictability in original paper clear.

## Post-Publication Decay

Chen-Zimmermann replication: in-sample 0.82 percent a month, t 2.6; after publication 0.74 percent, t 1.9, 91 percent of in-sample; 2016 to 2025 0.75 percent, t 1.1.

Decay source: Open Source Cross-Sectional Asset Pricing. Chen, Zimmermann, 2020, SSRN Electronic Journal. https://doi.org/10.2139/ssrn.3604626 (Crossref search, fetched 2026-11-27)

## Capacity

Small: equal-weighted sort tilted to microcaps.

## Data Needed

[D-filings](../../03-data-sources/cards/D-filings.md), [D-market](../../03-data-sources/cards/D-market.md)

## Implementation

[OpenSourceAP/CrossSection](https://github.com/OpenSourceAP/CrossSection), signal `sfe`.

Grades: A retail with free data and a small account; B retail with paid data, margin or more capital; C edge thin after retail costs or needs low latency; D institutional balance sheet or access; F closed or not feasible.
