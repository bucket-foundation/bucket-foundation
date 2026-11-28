# Change in Taxes

ID: `eq-cz-chtax`
Family: Equities
Retail feasibility: **B**
As of: 2026-11-27
Bead: `bkt-q5moa.15`
Origin: Chen-Zimmermann

## Logic

Signal: Change in Taxes. Buy the stocks with the highest values and short the lowest, 10 percent tails, EW weights, rebalanced every 3 months. 4-quarter change in quarterly total taxes (txtq), scaled by lagged total assets (at).

## Source

1. Tax Expense Momentum. THOMAS, ZHANG, 2011, Journal of Accounting Research. https://doi.org/10.1111/j.1475-679x.2011.00409.x (Crossref search, fetched 2026-11-27)
2. Chen and Zimmermann, Open Source Asset Pricing SignalDoc.csv, release 2026.10. https://huggingface.co/datasets/OpenSourceAP/CrossSection (web fetch, fetched 2026-11-27)

## Claimed Edge

Original paper, sample 1977 to 2006: long-short 1.30 percent a month, t-stat 11.26. Chen-Zimmermann class: predictor, predictability in original paper clear.

## Post-Publication Decay

Chen-Zimmermann replication: in-sample 1.05 percent a month, t 9.1; after publication 0.43 percent, t 2.9, 41 percent of in-sample; 2016 to 2025 0.31 percent, t 1.6.

Decay source: Open Source Cross-Sectional Asset Pricing. Chen, Zimmermann, 2020, SSRN Electronic Journal. https://doi.org/10.2139/ssrn.3604626 (Crossref search, fetched 2026-11-27)

## Capacity

Small: equal-weighted sort tilted to microcaps.

## Data Needed

[D-filings](../../03-data-sources/cards/D-filings.md), [D-market](../../03-data-sources/cards/D-market.md)

## Implementation

[OpenSourceAP/CrossSection](https://github.com/OpenSourceAP/CrossSection), signal `ChTax`.

Grades: A retail with free data and a small account; B retail with paid data, margin or more capital; C edge thin after retail costs or needs low latency; D institutional balance sheet or access; F closed or not feasible.
