# Earnings timeliness

ID: `eq-cz-earningstimeliness`
Family: Equities
Retail feasibility: **C**
As of: 2026-11-27
Bead: `bkt-q5moa.15`
Origin: Chen-Zimmermann

## Logic

Signal: Earnings timeliness. Buy the stocks with the highest values and short the lowest, 20 percent tails, EW weights, rebalanced every 1 months. Earnings (ib) scaled by market capitalization (shrout*abs(prc)) regressed on the 15 month stock return from (t=-11 to t=+3), an indicator for whether that 15- month return is negative and the interaction of these two variables.

## Source

1. Costs of Equity and Earnings Attributes. Francis and co-authors, 2004, The Accounting Review. https://doi.org/10.2308/accr.2004.79.4.967 (Crossref search, fetched 2026-11-27)
2. Chen and Zimmermann, Open Source Asset Pricing SignalDoc.csv, release 2026.10. https://huggingface.co/datasets/OpenSourceAP/CrossSection (web fetch, fetched 2026-11-27)

## Claimed Edge

Original paper, sample 1975 to 2001: correlated with BM and other predictors. Chen-Zimmermann class: placebo, predictability in original paper indirect.

## Post-Publication Decay

Chen-Zimmermann replication: in-sample -0.03 percent a month, t -0.4; after publication 0.12 percent, t 1.5, -365 percent of in-sample; 2016 to 2025 0.13 percent, t 1.0.

Decay source: Open Source Cross-Sectional Asset Pricing. Chen, Zimmermann, 2020, SSRN Electronic Journal. https://doi.org/10.2139/ssrn.3604626 (Crossref search, fetched 2026-11-27)

## Capacity

Large: value-weighted sort.

## Data Needed

[D-filings](../../03-data-sources/cards/D-filings.md), [D-market](../../03-data-sources/cards/D-market.md)

## Implementation

[OpenSourceAP/CrossSection](https://github.com/OpenSourceAP/CrossSection), signal `EarningsTimeliness`.

Grades: A retail with free data and a small account; B retail with paid data, margin or more capital; C edge thin after retail costs or needs low latency; D institutional balance sheet or access; F closed or not feasible.
