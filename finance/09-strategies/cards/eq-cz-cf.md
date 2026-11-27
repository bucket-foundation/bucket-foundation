# Cash flow to market

ID: `eq-cz-cf`
Family: Equities
Retail feasibility: **C**
As of: 2026-11-27
Bead: `bkt-q5moa.15`
Origin: Chen-Zimmermann

## Logic

Signal: Cash flow to market. Buy the stocks with the highest values and short the lowest, 10 percent tails, EW weights, rebalanced every 12 months. Net income (ib) plus depreciation (dp) divided by market equity.

## Source

1. Contrarian Investment, Extrapolation, and Risk. Lakonishok and co-authors, 1993, Crossref. https://doi.org/10.3386/w4360 (Crossref search, fetched 2026-11-27)
2. Chen and Zimmermann, Open Source Asset Pricing SignalDoc.csv, release 2026.10. https://huggingface.co/datasets/OpenSourceAP/CrossSection (web fetch, fetched 2026-11-27)

## Claimed Edge

Original paper, sample 1968 to 1990: long-short 0.66 percent a month, t-stat 3.379. Chen-Zimmermann class: predictor, predictability in original paper clear.

## Post-Publication Decay

Chen-Zimmermann replication: in-sample 0.82 percent a month, t 4.0; after publication 0.34 percent, t 1.2, 41 percent of in-sample; 2016 to 2025 0.41 percent, t 0.7.

Decay source: Open Source Cross-Sectional Asset Pricing. Chen, Zimmermann, 2020, SSRN Electronic Journal. https://doi.org/10.2139/ssrn.3604626 (Crossref search, fetched 2026-11-27)

## Capacity

Small: equal-weighted sort tilted to microcaps.

## Data Needed

[D-filings](../../03-data-sources/cards/D-filings.md), [D-market](../../03-data-sources/cards/D-market.md)

## Implementation

[OpenSourceAP/CrossSection](https://github.com/OpenSourceAP/CrossSection), signal `CF`.

## Merged Duplicates

- CFq

Grades: A retail with free data and a small account; B retail with paid data, margin or more capital; C edge thin after retail costs or needs low latency; D institutional balance sheet or access; F closed or not feasible.
