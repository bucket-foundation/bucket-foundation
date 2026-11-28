# Change in net operating assets

ID: `eq-cz-dnoa`
Family: Equities
Retail feasibility: **C**
As of: 2026-11-27
Bead: `bkt-q5moa.15`
Origin: Chen-Zimmermann

## Logic

Signal: change in net operating assets. Buy the stocks with the lowest values and short the highest, 20 percent tails, EW weights, rebalanced every 1 months. 12-month growth in Net Operating Assets scaled by lagged total assets (at).

## Source

1. Do investors overvalue firms with bloated balance sheets?. Hirshleifer and co-authors, 2004, Journal of Accounting and Economics. https://doi.org/10.1016/j.jacceco.2004.10.002 (Crossref search, fetched 2026-11-27)
2. Chen and Zimmermann, Open Source Asset Pricing SignalDoc.csv, release 2026.10. https://huggingface.co/datasets/OpenSourceAP/CrossSection (web fetch, fetched 2026-11-27)

## Claimed Edge

Original paper, sample 1964 to 2002: t=8.9 in mv reg. Chen-Zimmermann class: predictor, predictability in original paper clear.

## Post-Publication Decay

Chen-Zimmermann replication: in-sample 1.06 percent a month, t 9.4; after publication 0.14 percent, t 1.2, 13 percent of in-sample; 2016 to 2025 -0.01 percent, t -0.0.

Decay source: Open Source Cross-Sectional Asset Pricing. Chen, Zimmermann, 2020, SSRN Electronic Journal. https://doi.org/10.2139/ssrn.3604626 (Crossref search, fetched 2026-11-27)

## Capacity

Small: equal-weighted sort tilted to microcaps.

## Data Needed

[D-filings](../../03-data-sources/cards/D-filings.md), [D-market](../../03-data-sources/cards/D-market.md)

## Implementation

[OpenSourceAP/CrossSection](https://github.com/OpenSourceAP/CrossSection), signal `dNoa`.

Grades: A retail with free data and a small account; B retail with paid data, margin or more capital; C edge thin after retail costs or needs low latency; D institutional balance sheet or access; F closed or not feasible.
