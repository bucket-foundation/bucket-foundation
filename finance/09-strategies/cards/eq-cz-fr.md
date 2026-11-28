# Pension Funding Status

ID: `eq-cz-fr`
Family: Equities
Retail feasibility: **F**
As of: 2026-11-27
Bead: `bkt-q5moa.15`
Origin: Chen-Zimmermann

## Logic

Signal: Pension Funding Status. Buy the stocks with the highest values and short the lowest, 10 percent tails, EW weights, rebalanced every 12 months. FR = (FVPA - PBO), scaled by market value of equity.

## Source

1. Pension Plan Funding and Stock Market Efficiency. Franzoni, Marin, 2004, Crossref. https://doi.org/10.2139/ssrn.590683 (Crossref search, fetched 2026-11-27)
2. Chen and Zimmermann, Open Source Asset Pricing SignalDoc.csv, release 2026.10. https://huggingface.co/datasets/OpenSourceAP/CrossSection (web fetch, fetched 2026-11-27)

## Claimed Edge

Original paper, sample 1980 to 2002: long-short 0.49 percent a month, t-stat. Chen-Zimmermann class: predictor, predictability in original paper likely.

## Post-Publication Decay

Chen-Zimmermann replication: in-sample 0.28 percent a month, t 1.6; after publication -0.41 percent, t -1.5, -146 percent of in-sample; 2016 to 2025 -0.39 percent, t -1.0.

Decay source: Open Source Cross-Sectional Asset Pricing. Chen, Zimmermann, 2020, SSRN Electronic Journal. https://doi.org/10.2139/ssrn.3604626 (Crossref search, fetched 2026-11-27)

## Capacity

Small: equal-weighted sort tilted to microcaps.

## Data Needed

[D-filings](../../03-data-sources/cards/D-filings.md), [D-market](../../03-data-sources/cards/D-market.md)

## Implementation

[OpenSourceAP/CrossSection](https://github.com/OpenSourceAP/CrossSection), signal `FR`.

## Merged Duplicates

- FRbook

Grades: A retail with free data and a small account; B retail with paid data, margin or more capital; C edge thin after retail costs or needs low latency; D institutional balance sheet or access; F closed or not feasible.
