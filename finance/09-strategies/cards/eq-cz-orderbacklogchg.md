# Change in order backlog

ID: `eq-cz-orderbacklogchg`
Family: Equities
Retail feasibility: **B**
As of: 2026-11-27
Bead: `bkt-q5moa.15`
Origin: Chen-Zimmermann

## Logic

Signal: Change in order backlog. Buy the stocks with the highest values and short the lowest, 10 percent tails, EW weights, rebalanced every 12 months. Define normalized order backlog as order backlog (ob) divided by average total assets (at) in years t-1 and t.

## Source

1. Changes in Order Backlog and Future Returns. Bok Baik, Tae Sik Ahn, 2007, Seoul Journal of Business. https://doi.org/10.35152/snusjb.2007.13.2.005 (Crossref search, fetched 2026-11-27)
2. Chen and Zimmermann, Open Source Asset Pricing SignalDoc.csv, release 2026.10. https://huggingface.co/datasets/OpenSourceAP/CrossSection (web fetch, fetched 2026-11-27)

## Claimed Edge

Original paper, sample 1971 to 1999: long-short 1.17 percent a month, t-stat. Chen-Zimmermann class: predictor, predictability in original paper clear.

## Post-Publication Decay

Chen-Zimmermann replication: in-sample 0.36 percent a month, t 2.4; after publication 0.64 percent, t 2.5, 177 percent of in-sample; 2016 to 2025 1.02 percent, t 2.8.

Decay source: Open Source Cross-Sectional Asset Pricing. Chen, Zimmermann, 2020, SSRN Electronic Journal. https://doi.org/10.2139/ssrn.3604626 (Crossref search, fetched 2026-11-27)

## Capacity

Small: equal-weighted sort tilted to microcaps.

## Data Needed

[D-filings](../../03-data-sources/cards/D-filings.md), [D-market](../../03-data-sources/cards/D-market.md)

## Implementation

[OpenSourceAP/CrossSection](https://github.com/OpenSourceAP/CrossSection), signal `OrderBacklogChg`.

Grades: A retail with free data and a small account; B retail with paid data, margin or more capital; C edge thin after retail costs or needs low latency; D institutional balance sheet or access; F closed or not feasible.
