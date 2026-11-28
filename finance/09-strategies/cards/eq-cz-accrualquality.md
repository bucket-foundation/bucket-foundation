# Accrual Quality

ID: `eq-cz-accrualquality`
Family: Equities
Retail feasibility: **F**
As of: 2026-11-27
Bead: `bkt-q5moa.15`
Origin: Chen-Zimmermann

## Logic

Signal: Accrual Quality. Buy the stocks with the highest values and short the lowest, 20 percent tails, EW weights, rebalanced every 1 months. Define Accruals (tempAccruals) as (difference between current assets (act) and one-year lagged current assets) - (difference between cash and short-term investments (che) and one-year lagged cash and short-term investments) - (difference between current liabilities (lct) and one-year lagged current liabilities) + (difference between debt in current liabilities (dlc) and one-year lagged debt in cur

## Source

1. The market pricing of accruals quality. Francis and co-authors, 2005, Journal of Accounting and Economics. https://doi.org/10.1016/j.jacceco.2004.06.003 (Crossref search, fetched 2026-11-27)
2. Chen and Zimmermann, Open Source Asset Pricing SignalDoc.csv, release 2026.10. https://huggingface.co/datasets/OpenSourceAP/CrossSection (web fetch, fetched 2026-11-27)

## Claimed Edge

Original paper, sample 1971 to 2002: correlated with E/P and factor structure. Chen-Zimmermann class: placebo, predictability in original paper indirect.

## Post-Publication Decay

Chen-Zimmermann replication: in-sample 0.17 percent a month, t 0.6; after publication -0.29 percent, t -1.4, -179 percent of in-sample; 2016 to 2025 -0.37 percent, t -1.1.

Decay source: Open Source Cross-Sectional Asset Pricing. Chen, Zimmermann, 2020, SSRN Electronic Journal. https://doi.org/10.2139/ssrn.3604626 (Crossref search, fetched 2026-11-27)

## Capacity

Large: value-weighted sort.

## Data Needed

[D-filings](../../03-data-sources/cards/D-filings.md), [D-market](../../03-data-sources/cards/D-market.md)

## Implementation

[OpenSourceAP/CrossSection](https://github.com/OpenSourceAP/CrossSection), signal `AccrualQuality`.

## Merged Duplicates

- AccrualQualityJune

Grades: A retail with free data and a small account; B retail with paid data, margin or more capital; C edge thin after retail costs or needs low latency; D institutional balance sheet or access; F closed or not feasible.
