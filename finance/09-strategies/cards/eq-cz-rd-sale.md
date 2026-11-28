# R&D to sales

ID: `eq-cz-rd-sale`
Family: Equities
Retail feasibility: **F**
As of: 2026-11-27
Bead: `bkt-q5moa.15`
Origin: Chen-Zimmermann

## Logic

Signal: R&D to sales. Buy the stocks with the highest values and short the lowest, 20 percent tails, EW weights, rebalanced every 12 months. One year lagged R&D (xrd) divided by one year lagged sales (sale).

## Source

1. Chan, Lakonishok and Sougiannis 2001, JF. Paper not resolved on Crossref; citation from SignalDoc.
2. Chen and Zimmermann, Open Source Asset Pricing SignalDoc.csv, release 2026.10. https://huggingface.co/datasets/OpenSourceAP/CrossSection (web fetch, fetched 2026-11-27)

## Claimed Edge

Original paper, sample 1975 to 1995: long-short 0.08 percent a month, t-stat. Chen-Zimmermann class: placebo, predictability in original paper not.

## Post-Publication Decay

Chen-Zimmermann replication: in-sample 0.12 percent a month, t 0.5; after publication -0.54 percent, t -1.5, -461 percent of in-sample; 2016 to 2025 -0.85 percent, t -1.4.

Decay source: Open Source Cross-Sectional Asset Pricing. Chen, Zimmermann, 2020, SSRN Electronic Journal. https://doi.org/10.2139/ssrn.3604626 (Crossref search, fetched 2026-11-27)

## Capacity

Small: equal-weighted sort tilted to microcaps.

## Data Needed

[D-filings](../../03-data-sources/cards/D-filings.md), [D-market](../../03-data-sources/cards/D-market.md)

## Implementation

[OpenSourceAP/CrossSection](https://github.com/OpenSourceAP/CrossSection), signal `rd_sale`.

## Merged Duplicates

- rd_sale_q

Grades: A retail with free data and a small account; B retail with paid data, margin or more capital; C edge thin after retail costs or needs low latency; D institutional balance sheet or access; F closed or not feasible.
