# Earnings Smoothness

ID: `eq-cz-earningssmoothness`
Family: Equities
Retail feasibility: **C**
As of: 2026-11-27
Bead: `bkt-q5moa.15`
Origin: Chen-Zimmermann

## Logic

Signal: Earnings Smoothness. Buy the stocks with the highest values and short the lowest, 20 percent tails, EW weights, rebalanced every 1 months. 10-year rolling standard deviation of (ib/at) divided by 10-year rolling standard deviation of cash-flow ((ib - ( (act - act_{t-1}) - (lct - lct_{t-1}) - (che - che_{t-1}) + (dlc - dlc_{t-1}) - dp))/at_{t-1})

## Source

1. Costs of Equity and Earnings Attributes. Francis and co-authors, 2004, The Accounting Review. https://doi.org/10.2308/accr.2004.79.4.967 (Crossref search, fetched 2026-11-27)
2. Chen and Zimmermann, Open Source Asset Pricing SignalDoc.csv, release 2026.10. https://huggingface.co/datasets/OpenSourceAP/CrossSection (web fetch, fetched 2026-11-27)

## Claimed Edge

Original paper, sample 1975 to 2001: correlated with BM and other predictors. Chen-Zimmermann class: placebo, predictability in original paper indirect.

## Post-Publication Decay

Chen-Zimmermann replication: in-sample 0.01 percent a month, t 0.1; after publication 0.20 percent, t 1.0, 2222 percent of in-sample; 2016 to 2025 0.15 percent, t 0.5.

Decay source: Open Source Cross-Sectional Asset Pricing. Chen, Zimmermann, 2020, SSRN Electronic Journal. https://doi.org/10.2139/ssrn.3604626 (Crossref search, fetched 2026-11-27)

## Capacity

Large: value-weighted sort.

## Data Needed

[D-filings](../../03-data-sources/cards/D-filings.md), [D-market](../../03-data-sources/cards/D-market.md)

## Implementation

[OpenSourceAP/CrossSection](https://github.com/OpenSourceAP/CrossSection), signal `EarningsSmoothness`.

Grades: A retail with free data and a small account; B retail with paid data, margin or more capital; C edge thin after retail costs or needs low latency; D institutional balance sheet or access; F closed or not feasible.
