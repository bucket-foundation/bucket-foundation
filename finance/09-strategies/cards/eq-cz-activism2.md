# Active shareholders

ID: `eq-cz-activism2`
Family: Equities
Retail feasibility: **F**
As of: 2026-11-27
Bead: `bkt-q5moa.15`
Origin: Chen-Zimmermann

## Logic

Signal: Active shareholders. Buy the stocks with the highest values and short the lowest, 25 percent tails, VW weights, rebalanced every 1 months. Institiutional ownership share (maxinstown\_perc) if share greater than 5 percent.

## Source

1. Governance Mechanisms and Equity Prices. CREMERS, NAIR, 2005, The Journal of Finance. https://doi.org/10.1111/j.1540-6261.2005.00819.x (Crossref search, fetched 2026-11-27)
2. Chen and Zimmermann, Open Source Asset Pricing SignalDoc.csv, release 2026.10. https://huggingface.co/datasets/OpenSourceAP/CrossSection (web fetch, fetched 2026-11-27)

## Claimed Edge

Original paper, sample 1990 to 2001: long-short 0.66 percent a month, t-stat 2.0. Chen-Zimmermann class: predictor, predictability in original paper likely.

## Post-Publication Decay

Chen-Zimmermann replication: in-sample 0.43 percent a month, t 1.0; after publication 0.10 percent, t 0.1, 23 percent of in-sample.

Decay source: Open Source Cross-Sectional Asset Pricing. Chen, Zimmermann, 2020, SSRN Electronic Journal. https://doi.org/10.2139/ssrn.3604626 (Crossref search, fetched 2026-11-27)

## Capacity

Large: value-weighted sort.

## Data Needed

[D-filings](../../03-data-sources/cards/D-filings.md), [D-market](../../03-data-sources/cards/D-market.md)

## Implementation

[OpenSourceAP/CrossSection](https://github.com/OpenSourceAP/CrossSection), signal `Activism2`.

Grades: A retail with free data and a small account; B retail with paid data, margin or more capital; C edge thin after retail costs or needs low latency; D institutional balance sheet or access; F closed or not feasible.
