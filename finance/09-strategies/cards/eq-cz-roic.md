# Return on invested capital

ID: `eq-cz-roic`
Family: Equities
Retail feasibility: **C**
As of: 2026-11-27
Bead: `bkt-q5moa.15`
Origin: Chen-Zimmermann

## Logic

Signal: Return on invested capital. Buy the stocks with the highest values and short the lowest, 20 percent tails, EW weights, rebalanced every 12 months. EBIT (ebit) minus non-operating income (nopi) divided by the sum of equity (ceq), liabilities (lt) and cash (che).

## Source

1. Brown and Rowe 2007, WP. Paper not resolved on Crossref; citation from SignalDoc.
2. Chen and Zimmermann, Open Source Asset Pricing SignalDoc.csv, release 2026.10. https://huggingface.co/datasets/OpenSourceAP/CrossSection (web fetch, fetched 2026-11-27)

## Claimed Edge

Original paper, sample 1970 to 2005: long-short 0.14 percent a month, t-stat 0.9. Chen-Zimmermann class: placebo, predictability in original paper not.

## Post-Publication Decay

Chen-Zimmermann replication: in-sample 0.04 percent a month, t 0.2; after publication 0.45 percent, t 1.3, 1037 percent of in-sample; 2016 to 2025 0.72 percent, t 1.4.

Decay source: Open Source Cross-Sectional Asset Pricing. Chen, Zimmermann, 2020, SSRN Electronic Journal. https://doi.org/10.2139/ssrn.3604626 (Crossref search, fetched 2026-11-27)

## Capacity

Small: equal-weighted sort tilted to microcaps.

## Data Needed

[D-filings](../../03-data-sources/cards/D-filings.md), [D-market](../../03-data-sources/cards/D-market.md)

## Implementation

[OpenSourceAP/CrossSection](https://github.com/OpenSourceAP/CrossSection), signal `roic`.

Grades: A retail with free data and a small account; B retail with paid data, margin or more capital; C edge thin after retail costs or needs low latency; D institutional balance sheet or access; F closed or not feasible.
