# Long-term forecast dispersion

ID: `eq-cz-forecastdispersionlt`
Family: Equities
Retail feasibility: **C**
As of: 2026-11-27
Bead: `bkt-q5moa.15`
Origin: Chen-Zimmermann

## Logic

Signal: Long-term forecast dispersion. Buy the stocks with the highest values and short the lowest, 50 percent tails, VW weights, rebalanced every 1 months. Standard deviation of earnings estimates (stdev\_est) scaled by mean earnings estimate.

## Source

1. Do Heterogeneous Beliefs Matter for Asset Pricing?. Anderson and co-authors, 2005, Review of Financial Studies. https://doi.org/10.1093/rfs/hhi026 (Crossref search, fetched 2026-11-27)
2. Chen and Zimmermann, Open Source Asset Pricing SignalDoc.csv, release 2026.10. https://huggingface.co/datasets/OpenSourceAP/CrossSection (web fetch, fetched 2026-11-27)

## Claimed Edge

Original paper, sample 1991 to 1997: long-short 0.23 percent a month, t-stat 0.96. Chen-Zimmermann class: placebo, predictability in original paper not.

## Post-Publication Decay

Chen-Zimmermann replication: in-sample -0.00 percent a month, t -0.0; after publication 0.16 percent, t 1.2, -5367 percent of in-sample; 2016 to 2025 0.23 percent, t 1.1.

Decay source: Open Source Cross-Sectional Asset Pricing. Chen, Zimmermann, 2020, SSRN Electronic Journal. https://doi.org/10.2139/ssrn.3604626 (Crossref search, fetched 2026-11-27)

## Capacity

Large: value-weighted sort.

## Data Needed

[D-filings](../../03-data-sources/cards/D-filings.md), [D-market](../../03-data-sources/cards/D-market.md)

## Implementation

[OpenSourceAP/CrossSection](https://github.com/OpenSourceAP/CrossSection), signal `ForecastDispersionLT`.

Grades: A retail with free data and a small account; B retail with paid data, margin or more capital; C edge thin after retail costs or needs low latency; D institutional balance sheet or access; F closed or not feasible.
