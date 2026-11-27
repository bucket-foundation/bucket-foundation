# Price delay r square

ID: `eq-cz-pricedelayrsq`
Family: Equities
Retail feasibility: **F**
As of: 2026-11-27
Bead: `bkt-q5moa.15`
Origin: Chen-Zimmermann

## Logic

Signal: Price delay r square. Buy the stocks with the highest values and short the lowest, 10 percent tails, EW weights, rebalanced every 12 months. Each July regress stock return on day $t$ on market return in $t, t-1, \ldots, t-4$ using observations from July 1 of the previous year to June 30 of the current year.

## Source

1. Market Frictions, Price Delay, and the Cross-Section of Expected Returns. Hou, Moskowitz, 2003, Crossref. https://doi.org/10.2139/ssrn.408161 (Crossref search, fetched 2026-11-27)
2. Chen and Zimmermann, Open Source Asset Pricing SignalDoc.csv, release 2026.10. https://huggingface.co/datasets/OpenSourceAP/CrossSection (web fetch, fetched 2026-11-27)

## Claimed Edge

Original paper, sample 1964 to 2001: long-short 0.31 percent a month, t-stat 3.4. Chen-Zimmermann class: predictor, predictability in original paper clear.

## Post-Publication Decay

Chen-Zimmermann replication: in-sample 0.49 percent a month, t 2.7; after publication -0.23 percent, t -1.0, -47 percent of in-sample; 2016 to 2025 -0.53 percent, t -1.5.

Decay source: Open Source Cross-Sectional Asset Pricing. Chen, Zimmermann, 2020, SSRN Electronic Journal. https://doi.org/10.2139/ssrn.3604626 (Crossref search, fetched 2026-11-27)

## Capacity

Small: equal-weighted sort tilted to microcaps.

## Data Needed

[D-market](../../03-data-sources/cards/D-market.md)

## Implementation

[OpenSourceAP/CrossSection](https://github.com/OpenSourceAP/CrossSection), signal `PriceDelayRsq`.

## Merged Duplicates

- PriceDelaySlope
- PriceDelayTstat

Grades: A retail with free data and a small account; B retail with paid data, margin or more capital; C edge thin after retail costs or needs low latency; D institutional balance sheet or access; F closed or not feasible.
