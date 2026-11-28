# Excluded Expenses

ID: `eq-cz-exclexp`
Family: Equities
Retail feasibility: **C**
As of: 2026-11-27
Bead: `bkt-q5moa.15`
Origin: Chen-Zimmermann

## Logic

Signal: Excluded Expenses. Buy the stocks with the lowest values and short the highest, 20 percent tails, EW weights, rebalanced every 12 months. Difference between unadjusted earnings (EPSActualUnadj) from IBES and quarterly earnings per share (epspiq).

## Source

1. The Predictive Value of Expenses Excluded from Pro Forma Earnings. Doyle and co-authors, 2003, Review of Accounting Studies. https://doi.org/10.1023/a:1024472210359 (Crossref search, fetched 2026-11-27)
2. Chen and Zimmermann, Open Source Asset Pricing SignalDoc.csv, release 2026.10. https://huggingface.co/datasets/OpenSourceAP/CrossSection (web fetch, fetched 2026-11-27)

## Claimed Edge

Original paper, sample 1988 to 1999: t=5.7 in mv reg. Chen-Zimmermann class: predictor, predictability in original paper clear.

## Post-Publication Decay

Chen-Zimmermann replication: in-sample 0.25 percent a month, t 2.9; after publication 0.08 percent, t 0.9, 32 percent of in-sample; 2016 to 2025 0.10 percent, t 0.7.

Decay source: Open Source Cross-Sectional Asset Pricing. Chen, Zimmermann, 2020, SSRN Electronic Journal. https://doi.org/10.2139/ssrn.3604626 (Crossref search, fetched 2026-11-27)

## Capacity

Small: equal-weighted sort tilted to microcaps.

## Data Needed

[D-filings](../../03-data-sources/cards/D-filings.md), [D-market](../../03-data-sources/cards/D-market.md)

## Implementation

[OpenSourceAP/CrossSection](https://github.com/OpenSourceAP/CrossSection), signal `ExclExp`.

Grades: A retail with free data and a small account; B retail with paid data, margin or more capital; C edge thin after retail costs or needs low latency; D institutional balance sheet or access; F closed or not feasible.
