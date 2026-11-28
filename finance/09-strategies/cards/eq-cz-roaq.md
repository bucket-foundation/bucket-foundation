# Return on assets qtrly

ID: `eq-cz-roaq`
Family: Equities
Retail feasibility: **B**
As of: 2026-11-27
Bead: `bkt-q5moa.15`
Origin: Chen-Zimmermann

## Logic

Signal: Return on assets (qtrly). Buy the stocks with the highest values and short the lowest, 10 percent tails, EW weights, rebalanced every 1 months. Quarterly net income (ibq) divided by lagged total assets (atq).

## Source

1. Post loss/profit announcement drift. Balakrishnan and co-authors, 2010, Journal of Accounting and Economics. https://doi.org/10.1016/j.jacceco.2009.12.002 (Crossref search, fetched 2026-11-27)
2. Chen and Zimmermann, Open Source Asset Pricing SignalDoc.csv, release 2026.10. https://huggingface.co/datasets/OpenSourceAP/CrossSection (web fetch, fetched 2026-11-27)

## Claimed Edge

Original paper, sample 1976 to 2005: long-short 0.84 percent a month, t-stat 6.45. Chen-Zimmermann class: predictor, predictability in original paper clear.

## Post-Publication Decay

Chen-Zimmermann replication: in-sample 1.57 percent a month, t 5.5; after publication 1.35 percent, t 3.2, 86 percent of in-sample; 2016 to 2025 1.60 percent, t 2.7.

Decay source: Open Source Cross-Sectional Asset Pricing. Chen, Zimmermann, 2020, SSRN Electronic Journal. https://doi.org/10.2139/ssrn.3604626 (Crossref search, fetched 2026-11-27)

## Capacity

Small: equal-weighted sort tilted to microcaps.

## Data Needed

[D-filings](../../03-data-sources/cards/D-filings.md), [D-market](../../03-data-sources/cards/D-market.md)

## Implementation

[OpenSourceAP/CrossSection](https://github.com/OpenSourceAP/CrossSection), signal `roaq`.

## Merged Duplicates

- Quantpedia roa-effect-within-stocks

Grades: A retail with free data and a small account; B retail with paid data, margin or more capital; C edge thin after retail costs or needs low latency; D institutional balance sheet or access; F closed or not feasible.
