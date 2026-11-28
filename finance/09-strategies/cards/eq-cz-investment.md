# Investment to revenue

ID: `eq-cz-investment`
Family: Equities
Retail feasibility: **C**
As of: 2026-11-27
Bead: `bkt-q5moa.15`
Origin: Chen-Zimmermann

## Logic

Signal: Investment to revenue. Buy the stocks with the lowest values and short the highest, 20 percent tails, VW weights, rebalanced every 12 months. Ratio of capital investment (capx) to revenue (revt) divided by the firm-specific 36-month rolling mean of that ratio.

## Source

1. Titman, Wei and Xie 2004, JFQA. Paper not resolved on Crossref; citation from SignalDoc.
2. Chen and Zimmermann, Open Source Asset Pricing SignalDoc.csv, release 2026.10. https://huggingface.co/datasets/OpenSourceAP/CrossSection (web fetch, fetched 2026-11-27)

## Claimed Edge

Original paper, sample 1973 to 1996: long-short 0.17 percent a month, t-stat 2.86. Chen-Zimmermann class: predictor, predictability in original paper clear.

## Post-Publication Decay

Chen-Zimmermann replication: in-sample 0.24 percent a month, t 2.1; after publication 0.17 percent, t 0.9, 69 percent of in-sample; 2016 to 2025 0.37 percent, t 1.2.

Decay source: Open Source Cross-Sectional Asset Pricing. Chen, Zimmermann, 2020, SSRN Electronic Journal. https://doi.org/10.2139/ssrn.3604626 (Crossref search, fetched 2026-11-27)

## Capacity

Large: value-weighted sort.

## Data Needed

[D-filings](../../03-data-sources/cards/D-filings.md), [D-market](../../03-data-sources/cards/D-market.md)

## Implementation

[OpenSourceAP/CrossSection](https://github.com/OpenSourceAP/CrossSection), signal `Investment`.

Grades: A retail with free data and a small account; B retail with paid data, margin or more capital; C edge thin after retail costs or needs low latency; D institutional balance sheet or access; F closed or not feasible.
