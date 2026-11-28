# Depreciation to PPE

ID: `eq-cz-depr`
Family: Equities
Retail feasibility: **C**
As of: 2026-11-27
Bead: `bkt-q5moa.15`
Origin: Chen-Zimmermann

## Logic

Signal: Depreciation to PPE. Buy the stocks with the highest values and short the lowest, 20 percent tails, EW weights, rebalanced every 1 months. Depreciation and amortization (dp) divided by property, plant and equipment net total (ppent).

## Source

1. The prediction of stock returns using financial statement information. Holthausen, Larcker, 1992, Journal of Accounting and Economics. https://doi.org/10.1016/0165-4101(92)90025-w (Crossref search, fetched 2026-11-27)
2. Chen and Zimmermann, Open Source Asset Pricing SignalDoc.csv, release 2026.10. https://huggingface.co/datasets/OpenSourceAP/CrossSection (web fetch, fetched 2026-11-27)

## Claimed Edge

Original paper, sample 1978 to 1988: ingredient in complicated model. Chen-Zimmermann class: placebo, predictability in original paper indirect.

## Post-Publication Decay

Chen-Zimmermann replication: in-sample 0.29 percent a month, t 1.1; after publication 0.31 percent, t 1.5, 109 percent of in-sample; 2016 to 2025 -0.23 percent, t -0.9.

Decay source: Open Source Cross-Sectional Asset Pricing. Chen, Zimmermann, 2020, SSRN Electronic Journal. https://doi.org/10.2139/ssrn.3604626 (Crossref search, fetched 2026-11-27)

## Capacity

Large: value-weighted sort.

## Data Needed

[D-filings](../../03-data-sources/cards/D-filings.md), [D-market](../../03-data-sources/cards/D-market.md)

## Implementation

[OpenSourceAP/CrossSection](https://github.com/OpenSourceAP/CrossSection), signal `depr`.

Grades: A retail with free data and a small account; B retail with paid data, margin or more capital; C edge thin after retail costs or needs low latency; D institutional balance sheet or access; F closed or not feasible.
