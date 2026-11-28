# Growth in advertising expenses

ID: `eq-cz-gradexp`
Family: Equities
Retail feasibility: **F**
As of: 2026-11-27
Bead: `bkt-q5moa.15`
Origin: Chen-Zimmermann

## Logic

Signal: Growth in advertising expenses. Buy the stocks with the lowest values and short the highest, 10 percent tails, EW weights, rebalanced every 1 months. Log of advertising expense (xad) minus log of advertising expense last year.

## Source

1. Attracting Investor Attention through Advertising. Lou, 2014, Review of Financial Studies. https://doi.org/10.1093/rfs/hhu019 (Crossref search, fetched 2026-11-27)
2. Chen and Zimmermann, Open Source Asset Pricing SignalDoc.csv, release 2026.10. https://huggingface.co/datasets/OpenSourceAP/CrossSection (web fetch, fetched 2026-11-27)

## Claimed Edge

Original paper, sample 1974 to 2010: long-short 0.58 percent a month, t-stat 3.54. Chen-Zimmermann class: predictor, predictability in original paper clear.

## Post-Publication Decay

Chen-Zimmermann replication: in-sample 0.40 percent a month, t 3.7; after publication 0.02 percent, t 0.1, 4 percent of in-sample; 2016 to 2025 0.00 percent, t 0.0.

Decay source: Open Source Cross-Sectional Asset Pricing. Chen, Zimmermann, 2020, SSRN Electronic Journal. https://doi.org/10.2139/ssrn.3604626 (Crossref search, fetched 2026-11-27)

## Capacity

Small: equal-weighted sort tilted to microcaps.

## Data Needed

[D-filings](../../03-data-sources/cards/D-filings.md), [D-market](../../03-data-sources/cards/D-market.md)

## Implementation

[OpenSourceAP/CrossSection](https://github.com/OpenSourceAP/CrossSection), signal `GrAdExp`.

Grades: A retail with free data and a small account; B retail with paid data, margin or more capital; C edge thin after retail costs or needs low latency; D institutional balance sheet or access; F closed or not feasible.
