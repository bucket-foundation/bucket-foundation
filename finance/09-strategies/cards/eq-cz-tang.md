# Tangibility

ID: `eq-cz-tang`
Family: Equities
Retail feasibility: **F**
As of: 2026-11-27
Bead: `bkt-q5moa.15`
Origin: Chen-Zimmermann

## Logic

Signal: Tangibility. Buy the stocks with the highest values and short the lowest, 20 percent tails, EW weights, rebalanced every 1 months. Cash and short-term investments (che) plus.715*receivables (rect) +.547*inventory (invt) +.535* property, plant and equipment (ppent), scaled by total assets (at).

## Source

1. Financial Constraints, Debt Capacity, and the Cross‐section of Stock Returns. HAHN, LEE, 2009, The Journal of Finance. https://doi.org/10.1111/j.1540-6261.2009.01452.x (Crossref search, fetched 2026-11-27)
2. Chen and Zimmermann, Open Source Asset Pricing SignalDoc.csv, release 2026.10. https://huggingface.co/datasets/OpenSourceAP/CrossSection (web fetch, fetched 2026-11-27)

## Claimed Edge

Original paper, sample 1973 to 2001: t=3.37 in univariate FMB. Chen-Zimmermann class: predictor, predictability in original paper clear.

## Post-Publication Decay

Chen-Zimmermann replication: in-sample 0.69 percent a month, t 3.6; after publication 0.13 percent, t 0.4, 19 percent of in-sample; 2016 to 2025 0.16 percent, t 0.3.

Decay source: Open Source Cross-Sectional Asset Pricing. Chen, Zimmermann, 2020, SSRN Electronic Journal. https://doi.org/10.2139/ssrn.3604626 (Crossref search, fetched 2026-11-27)

## Capacity

Small: equal-weighted sort tilted to microcaps.

## Data Needed

[D-filings](../../03-data-sources/cards/D-filings.md), [D-market](../../03-data-sources/cards/D-market.md)

## Implementation

[OpenSourceAP/CrossSection](https://github.com/OpenSourceAP/CrossSection), signal `tang`.

## Merged Duplicates

- tang_q

Grades: A retail with free data and a small account; B retail with paid data, margin or more capital; C edge thin after retail costs or needs low latency; D institutional balance sheet or access; F closed or not feasible.
