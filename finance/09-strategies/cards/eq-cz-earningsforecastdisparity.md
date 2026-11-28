# Long-vs-short EPS forecasts

ID: `eq-cz-earningsforecastdisparity`
Family: Equities
Retail feasibility: **C**
As of: 2026-11-27
Bead: `bkt-q5moa.15`
Origin: Chen-Zimmermann

## Logic

Signal: Long-vs-short EPS forecasts. Buy the stocks with the lowest values and short the highest, 20 percent tails, EW weights, rebalanced every 1 months. Analyst forecasted 5-year earnings growth (fgr5yr) minus 100 times the difference between mean earnings forecast (meanest) and fiscal year earnings expectations (fy0a) scaled by the absolute value of fy0a.

## Source

1. Cashflow Risk, Systematic Earnings Revisions, and the Cross-Section of Stock Returns. Da, Warachka, 2008, Crossref. https://doi.org/10.2139/ssrn.1107159 (Crossref search, fetched 2026-11-27)
2. Chen and Zimmermann, Open Source Asset Pricing SignalDoc.csv, release 2026.10. https://huggingface.co/datasets/OpenSourceAP/CrossSection (web fetch, fetched 2026-11-27)

## Claimed Edge

Original paper, sample 1983 to 2006: long-short 0.48 percent a month, t-stat 5.08. Chen-Zimmermann class: predictor, predictability in original paper clear.

## Post-Publication Decay

Chen-Zimmermann replication: in-sample 0.66 percent a month, t 4.3; after publication 0.21 percent, t 1.0, 32 percent of in-sample; 2016 to 2025 0.02 percent, t 0.1.

Decay source: Open Source Cross-Sectional Asset Pricing. Chen, Zimmermann, 2020, SSRN Electronic Journal. https://doi.org/10.2139/ssrn.3604626 (Crossref search, fetched 2026-11-27)

## Capacity

Small: equal-weighted sort tilted to microcaps.

## Data Needed

[D-filings](../../03-data-sources/cards/D-filings.md), [D-market](../../03-data-sources/cards/D-market.md)

## Implementation

[OpenSourceAP/CrossSection](https://github.com/OpenSourceAP/CrossSection), signal `EarningsForecastDisparity`.

Grades: A retail with free data and a small account; B retail with paid data, margin or more capital; C edge thin after retail costs or needs low latency; D institutional balance sheet or access; F closed or not feasible.
