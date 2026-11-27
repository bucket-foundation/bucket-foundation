# Change in sales to inventory

ID: `eq-cz-pchsaleinv`
Family: Equities
Retail feasibility: **C**
As of: 2026-11-27
Bead: `bkt-q5moa.15`
Origin: Chen-Zimmermann

## Logic

Signal: Change in sales to inventory. Buy the stocks with the highest values and short the lowest, 20 percent tails, EW weights, rebalanced every 1 months. One year growth in sales (sale) to inventory (invt) ratio.

## Source

1. Accounting Measurement, Price-Earnings Ratio, and the Information Content of Security Prices. Ou, Penman, 1989, Journal of Accounting Research. https://doi.org/10.2307/2491068 (Crossref search, fetched 2026-11-27)
2. Chen and Zimmermann, Open Source Asset Pricing SignalDoc.csv, release 2026.10. https://huggingface.co/datasets/OpenSourceAP/CrossSection (web fetch, fetched 2026-11-27)

## Claimed Edge

Original paper, sample 1973 to 1983: ingredient in complicated model. Chen-Zimmermann class: placebo, predictability in original paper indirect.

## Post-Publication Decay

Chen-Zimmermann replication: in-sample 0.49 percent a month, t 5.3; after publication 0.12 percent, t 1.7, 25 percent of in-sample; 2016 to 2025 -0.28 percent, t -1.7.

Decay source: Open Source Cross-Sectional Asset Pricing. Chen, Zimmermann, 2020, SSRN Electronic Journal. https://doi.org/10.2139/ssrn.3604626 (Crossref search, fetched 2026-11-27)

## Capacity

Large: value-weighted sort.

## Data Needed

[D-filings](../../03-data-sources/cards/D-filings.md), [D-market](../../03-data-sources/cards/D-market.md)

## Implementation

[OpenSourceAP/CrossSection](https://github.com/OpenSourceAP/CrossSection), signal `pchsaleinv`.

Grades: A retail with free data and a small account; B retail with paid data, margin or more capital; C edge thin after retail costs or needs low latency; D institutional balance sheet or access; F closed or not feasible.
