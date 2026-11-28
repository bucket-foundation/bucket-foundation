# Inst Own and Idio Vol

ID: `eq-cz-rio-volatility`
Family: Equities
Retail feasibility: **B**
As of: 2026-11-27
Bead: `bkt-q5moa.15`
Origin: Chen-Zimmermann

## Logic

Signal: Inst Own and Idio Vol. Buy the stocks with the highest values and short the lowest, 20 percent tails, EW weights, rebalanced every 1 months. Follow RIO\_MB, except define volatility as the rolling standard deviation of the last 12 months of the stock return.

## Source

1. Short sales, institutional investors and the cross-section of stock returns. Nagel, 2005, Journal of Financial Economics. https://doi.org/10.1016/j.jfineco.2004.08.008 (Crossref search, fetched 2026-11-27)
2. Chen and Zimmermann, Open Source Asset Pricing SignalDoc.csv, release 2026.10. https://huggingface.co/datasets/OpenSourceAP/CrossSection (web fetch, fetched 2026-11-27)

## Claimed Edge

Original paper, sample 1980 to 2003: long-short 1.07 percent a month, t-stat 4.38. Chen-Zimmermann class: predictor, predictability in original paper clear.

## Post-Publication Decay

Chen-Zimmermann replication: in-sample 1.00 percent a month, t 4.1; after publication 0.76 percent, t 2.6, 77 percent of in-sample; 2016 to 2025 0.74 percent, t 1.9.

Decay source: Open Source Cross-Sectional Asset Pricing. Chen, Zimmermann, 2020, SSRN Electronic Journal. https://doi.org/10.2139/ssrn.3604626 (Crossref search, fetched 2026-11-27)

## Capacity

Small: equal-weighted sort tilted to microcaps.

## Data Needed

[D-filings](../../03-data-sources/cards/D-filings.md), [D-market](../../03-data-sources/cards/D-market.md)

## Implementation

[OpenSourceAP/CrossSection](https://github.com/OpenSourceAP/CrossSection), signal `RIO_Volatility`.

Grades: A retail with free data and a small account; B retail with paid data, margin or more capital; C edge thin after retail costs or needs low latency; D institutional balance sheet or access; F closed or not feasible.
