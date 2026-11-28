# Abnormal Accruals

ID: `eq-cz-abnormalaccruals`
Family: Equities
Retail feasibility: **F**
As of: 2026-11-27
Bead: `bkt-q5moa.15`
Origin: Chen-Zimmermann

## Logic

Signal: Abnormal Accruals. Buy the stocks with the lowest values and short the highest, 10 percent tails, EW weights, rebalanced every 12 months. Define Accruals as net income (ib) minus operating cash flow (oancf), divided by average total assets (at) for years t-1 and t.

## Source

1. The Mispricing of Abnormal Accruals. Xie, 2001, The Accounting Review. https://doi.org/10.2308/accr.2001.76.3.357 (Crossref search, fetched 2026-11-27)
2. Chen and Zimmermann, Open Source Asset Pricing SignalDoc.csv, release 2026.10. https://huggingface.co/datasets/OpenSourceAP/CrossSection (web fetch, fetched 2026-11-27)

## Claimed Edge

Original paper, sample 1971 to 1992: long-short 0.92 percent a month, t-stat 8.43. Chen-Zimmermann class: predictor, predictability in original paper clear.

## Post-Publication Decay

Chen-Zimmermann replication: in-sample 0.52 percent a month, t 4.8; after publication -0.10 percent, t -0.7, -20 percent of in-sample; 2016 to 2025 -0.08 percent, t -0.3.

Decay source: Open Source Cross-Sectional Asset Pricing. Chen, Zimmermann, 2020, SSRN Electronic Journal. https://doi.org/10.2139/ssrn.3604626 (Crossref search, fetched 2026-11-27)

## Capacity

Small: equal-weighted sort tilted to microcaps.

## Data Needed

[D-filings](../../03-data-sources/cards/D-filings.md), [D-market](../../03-data-sources/cards/D-market.md)

## Implementation

[OpenSourceAP/CrossSection](https://github.com/OpenSourceAP/CrossSection), signal `AbnormalAccruals`.

## Merged Duplicates

- AbnormalAccrualsPercent

Grades: A retail with free data and a small account; B retail with paid data, margin or more capital; C edge thin after retail costs or needs low latency; D institutional balance sheet or access; F closed or not feasible.
