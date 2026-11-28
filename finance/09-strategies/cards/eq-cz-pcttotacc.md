# Percent Total Accruals

ID: `eq-cz-pcttotacc`
Family: Equities
Retail feasibility: **B**
As of: 2026-11-27
Bead: `bkt-q5moa.15`
Origin: Chen-Zimmermann

## Logic

Signal: Percent Total Accruals. Buy the stocks with the lowest values and short the highest, 10 percent tails, EW weights, rebalanced every 12 months. Net income (ni) minus (purchase of common and preferred stock (prstkcc) minus sale of common and preferred stock (sstk) plus dividends (dvt), cash flow from operations (oancf), from financing (fincf) and investment (ivncf)).

## Source

1. Percent Accruals. Hafzalla and co-authors, 2010, Crossref. https://doi.org/10.2139/ssrn.1558464 (Crossref search, fetched 2026-11-27)
2. Chen and Zimmermann, Open Source Asset Pricing SignalDoc.csv, release 2026.10. https://huggingface.co/datasets/OpenSourceAP/CrossSection (web fetch, fetched 2026-11-27)

## Claimed Edge

Original paper, sample 1989 to 2008: long-short 0.71 percent a month, t-stat 3.29. Chen-Zimmermann class: predictor, predictability in original paper clear.

## Post-Publication Decay

Chen-Zimmermann replication: in-sample 0.51 percent a month, t 4.8; after publication 0.31 percent, t 2.2, 62 percent of in-sample; 2016 to 2025 0.33 percent, t 1.7.

Decay source: Open Source Cross-Sectional Asset Pricing. Chen, Zimmermann, 2020, SSRN Electronic Journal. https://doi.org/10.2139/ssrn.3604626 (Crossref search, fetched 2026-11-27)

## Capacity

Small: equal-weighted sort tilted to microcaps.

## Data Needed

[D-filings](../../03-data-sources/cards/D-filings.md), [D-market](../../03-data-sources/cards/D-market.md)

## Implementation

[OpenSourceAP/CrossSection](https://github.com/OpenSourceAP/CrossSection), signal `PctTotAcc`.

Grades: A retail with free data and a small account; B retail with paid data, margin or more capital; C edge thin after retail costs or needs low latency; D institutional balance sheet or access; F closed or not feasible.
