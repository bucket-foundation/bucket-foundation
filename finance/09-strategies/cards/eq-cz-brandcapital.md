# Brand capital to assets

ID: `eq-cz-brandcapital`
Family: Equities
Retail feasibility: **F**
As of: 2026-11-27
Bead: `bkt-q5moa.15`
Origin: Chen-Zimmermann

## Logic

Signal: Brand capital to assets. Buy the stocks with the highest values and short the lowest, 20 percent tails, EW weights, rebalanced every 1 months. Brand capital is computed by the perpetual inventory method.

## Source

1. Advertising, Brand Capital, and Asset Returns. Belo and co-authors, 2011, Crossref. https://doi.org/10.2139/ssrn.1786076 (Crossref search, fetched 2026-11-27)
2. Chen and Zimmermann, Open Source Asset Pricing SignalDoc.csv, release 2026.10. https://huggingface.co/datasets/OpenSourceAP/CrossSection (web fetch, fetched 2026-11-27)

## Claimed Edge

Original paper, sample 1975 to 2010: not studied for predictability. Chen-Zimmermann class: placebo, predictability in original paper indirect.

## Post-Publication Decay

Chen-Zimmermann replication: in-sample 0.23 percent a month, t 1.2; after publication -0.46 percent, t -1.3, -204 percent of in-sample; 2016 to 2025 -0.36 percent, t -0.9.

Decay source: Open Source Cross-Sectional Asset Pricing. Chen, Zimmermann, 2020, SSRN Electronic Journal. https://doi.org/10.2139/ssrn.3604626 (Crossref search, fetched 2026-11-27)

## Capacity

Large: value-weighted sort.

## Data Needed

[D-filings](../../03-data-sources/cards/D-filings.md), [D-market](../../03-data-sources/cards/D-market.md)

## Implementation

[OpenSourceAP/CrossSection](https://github.com/OpenSourceAP/CrossSection), signal `BrandCapital`.

Grades: A retail with free data and a small account; B retail with paid data, margin or more capital; C edge thin after retail costs or needs low latency; D institutional balance sheet or access; F closed or not feasible.
