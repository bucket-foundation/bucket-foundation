# Whited-Wu index

ID: `eq-cz-ww`
Family: Equities
Retail feasibility: **F**
As of: 2026-11-27
Bead: `bkt-q5moa.15`
Origin: Chen-Zimmermann

## Logic

Signal: Whited-Wu index. Buy the stocks with the highest values and short the lowest, 40 percent tails, EW weights, rebalanced every 12 months. Group data by 3 digit SIC code and month to compute total sales (sale) by industry.

## Source

1. Financial Constraints Risk. Whited, Wu, 2003, Crossref. https://doi.org/10.2139/ssrn.410816 (Crossref search, fetched 2026-11-27)
2. Chen and Zimmermann, Open Source Asset Pricing SignalDoc.csv, release 2026.10. https://huggingface.co/datasets/OpenSourceAP/CrossSection (web fetch, fetched 2026-11-27)

## Claimed Edge

Original paper, sample 1975 to 2001: long-short 0.23 percent a month, t-stat 1.32. Chen-Zimmermann class: placebo, predictability in original paper not.

## Post-Publication Decay

Chen-Zimmermann replication: in-sample 0.42 percent a month, t 1.5; after publication -0.16 percent, t -0.7, -37 percent of in-sample; 2016 to 2025 -0.33 percent, t -0.9.

Decay source: Open Source Cross-Sectional Asset Pricing. Chen, Zimmermann, 2020, SSRN Electronic Journal. https://doi.org/10.2139/ssrn.3604626 (Crossref search, fetched 2026-11-27)

## Capacity

Small: equal-weighted sort tilted to microcaps.

## Data Needed

[D-filings](../../03-data-sources/cards/D-filings.md), [D-market](../../03-data-sources/cards/D-market.md)

## Implementation

[OpenSourceAP/CrossSection](https://github.com/OpenSourceAP/CrossSection), signal `WW`.

## Merged Duplicates

- WW_Q

Grades: A retail with free data and a small account; B retail with paid data, margin or more capital; C edge thin after retail costs or needs low latency; D institutional balance sheet or access; F closed or not feasible.
