# Inst own among high short interest

ID: `eq-cz-io-shortinterest`
Family: Equities
Retail feasibility: **B**
As of: 2026-11-27
Bead: `bkt-q5moa.15`
Origin: Chen-Zimmermann

## Logic

Signal: Inst own among high short interest. Buy the stocks with the highest values and short the lowest, 33 percent tails, EW weights, rebalanced every 1 months. Exclude all stocks with short interest (ShortInterest) below 99th percentile.

## Source

1. Short Interest, Institutional Ownership, and Stock Returns. Asquith and co-authors, 2004, Crossref. https://doi.org/10.2139/ssrn.525623 (Crossref search, fetched 2026-11-27)
2. Chen and Zimmermann, Open Source Asset Pricing SignalDoc.csv, release 2026.10. https://huggingface.co/datasets/OpenSourceAP/CrossSection (web fetch, fetched 2026-11-27)

## Claimed Edge

Original paper, sample 1980 to 2002: long-short 0.98 percent a month, t-stat. Chen-Zimmermann class: predictor, predictability in original paper likely.

## Post-Publication Decay

Chen-Zimmermann replication: in-sample 2.20 percent a month, t 3.0; after publication 5.54 percent, t 3.1, 252 percent of in-sample; 2016 to 2025 8.00 percent, t 2.4.

Decay source: Open Source Cross-Sectional Asset Pricing. Chen, Zimmermann, 2020, SSRN Electronic Journal. https://doi.org/10.2139/ssrn.3604626 (Crossref search, fetched 2026-11-27)

## Capacity

Small: equal-weighted sort tilted to microcaps.

## Data Needed

[D-filings](../../03-data-sources/cards/D-filings.md), [D-market](../../03-data-sources/cards/D-market.md)

## Implementation

[OpenSourceAP/CrossSection](https://github.com/OpenSourceAP/CrossSection), signal `IO_ShortInterest`.

Grades: A retail with free data and a small account; B retail with paid data, margin or more capital; C edge thin after retail costs or needs low latency; D institutional balance sheet or access; F closed or not feasible.
