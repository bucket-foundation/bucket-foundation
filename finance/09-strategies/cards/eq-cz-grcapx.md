# Change in capex two years

ID: `eq-cz-grcapx`
Family: Equities
Retail feasibility: **C**
As of: 2026-11-27
Bead: `bkt-q5moa.15`
Origin: Chen-Zimmermann

## Logic

Signal: Change in capex (two years). Buy the stocks with the lowest values and short the highest, 20 percent tails, EW weights, rebalanced every 12 months. Growth rate of capital expenditures (capx) relative to two years ago.

## Source

1. Empirical Evidence on Capital Investment, Growth Options, and Security Returns. ANDERSON, GARCIA‐FEIJÓO, 2006, The Journal of Finance. https://doi.org/10.1111/j.1540-6261.2006.00833.x (Crossref search, fetched 2026-11-27)
2. Chen and Zimmermann, Open Source Asset Pricing SignalDoc.csv, release 2026.10. https://huggingface.co/datasets/OpenSourceAP/CrossSection (web fetch, fetched 2026-11-27)

## Claimed Edge

Original paper, sample 1976 to 1999: long-short 0.57 percent a month, t-stat 5.05. Chen-Zimmermann class: predictor, predictability in original paper clear.

## Post-Publication Decay

Chen-Zimmermann replication: in-sample 0.51 percent a month, t 5.2; after publication 0.20 percent, t 1.6, 40 percent of in-sample; 2016 to 2025 0.36 percent, t 1.7.

Decay source: Open Source Cross-Sectional Asset Pricing. Chen, Zimmermann, 2020, SSRN Electronic Journal. https://doi.org/10.2139/ssrn.3604626 (Crossref search, fetched 2026-11-27)

## Capacity

Small: equal-weighted sort tilted to microcaps.

## Data Needed

[D-filings](../../03-data-sources/cards/D-filings.md), [D-market](../../03-data-sources/cards/D-market.md)

## Implementation

[OpenSourceAP/CrossSection](https://github.com/OpenSourceAP/CrossSection), signal `grcapx`.

## Merged Duplicates

- grcapx3y
- grcapx1y

Grades: A retail with free data and a small account; B retail with paid data, margin or more capital; C edge thin after retail costs or needs low latency; D institutional balance sheet or access; F closed or not feasible.
