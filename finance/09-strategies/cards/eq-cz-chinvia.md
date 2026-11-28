# Change in capital inv ind adj

ID: `eq-cz-chinvia`
Family: Equities
Retail feasibility: **C**
As of: 2026-11-27
Bead: `bkt-q5moa.15`
Origin: Chen-Zimmermann

## Logic

Signal: Change in capital inv (ind adj). Buy the stocks with the lowest values and short the highest, 20 percent tails, EW weights, rebalanced every 12 months. Growth in capital expenditure (capx) minus average growth in capital expenditure in the same industry (two-digit SIC).

## Source

1. Abnormal returns to a fundamental analysis strategy.. Abarbanell, Bushee, 1998, The Accounting Review. https://doi.org/10.2308/tar-274315 (Crossref search, fetched 2026-11-27)
2. Chen and Zimmermann, Open Source Asset Pricing SignalDoc.csv, release 2026.10. https://huggingface.co/datasets/OpenSourceAP/CrossSection (web fetch, fetched 2026-11-27)

## Claimed Edge

Original paper, sample 1974 to 1988: t=2.9 in mv reg. Chen-Zimmermann class: predictor, predictability in original paper clear.

## Post-Publication Decay

Chen-Zimmermann replication: in-sample 0.49 percent a month, t 5.5; after publication 0.20 percent, t 1.7, 42 percent of in-sample; 2016 to 2025 -0.07 percent, t -0.3.

Decay source: Open Source Cross-Sectional Asset Pricing. Chen, Zimmermann, 2020, SSRN Electronic Journal. https://doi.org/10.2139/ssrn.3604626 (Crossref search, fetched 2026-11-27)

## Capacity

Small: equal-weighted sort tilted to microcaps.

## Data Needed

[D-filings](../../03-data-sources/cards/D-filings.md), [D-market](../../03-data-sources/cards/D-market.md)

## Implementation

[OpenSourceAP/CrossSection](https://github.com/OpenSourceAP/CrossSection), signal `ChInvIA`.

Grades: A retail with free data and a small account; B retail with paid data, margin or more capital; C edge thin after retail costs or needs low latency; D institutional balance sheet or access; F closed or not feasible.
