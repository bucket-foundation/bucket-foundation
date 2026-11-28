# Put volatility minus call volatility

ID: `eq-cz-smileslope`
Family: Equities
Retail feasibility: **B**
As of: 2026-11-27
Bead: `bkt-q5moa.15`
Origin: Chen-Zimmermann

## Logic

Signal: Put volatility minus call volatility. Buy the stocks with the lowest values and short the highest, 20 percent tails, EW weights, rebalanced every 1 months. Using OptionMetrics's daily volatility surfaces (vsurfd), keep last observation each month, delta = 0.50 or -0.50, and days to expiration = 30.

## Source

1. Jump Risk, Stock Returns, and Slope of Implied Volatility Smile. Yan, 2009, Crossref. https://doi.org/10.2139/ssrn.1355382 (Crossref search, fetched 2026-11-27)
2. Chen and Zimmermann, Open Source Asset Pricing SignalDoc.csv, release 2026.10. https://huggingface.co/datasets/OpenSourceAP/CrossSection (web fetch, fetched 2026-11-27)

## Claimed Edge

Original paper, sample 1996 to 2005: long-short 1.80 percent a month, t-stat 8.168. Chen-Zimmermann class: predictor, predictability in original paper clear.

## Post-Publication Decay

Chen-Zimmermann replication: in-sample 1.82 percent a month, t 8.2; after publication 0.85 percent, t 5.2, 46 percent of in-sample; 2016 to 2025 0.84 percent, t 3.6.

Decay source: Open Source Cross-Sectional Asset Pricing. Chen, Zimmermann, 2020, SSRN Electronic Journal. https://doi.org/10.2139/ssrn.3604626 (Crossref search, fetched 2026-11-27)

## Capacity

Small: equal-weighted sort tilted to microcaps.

## Data Needed

[D-market](../../03-data-sources/cards/D-market.md)

## Implementation

[OpenSourceAP/CrossSection](https://github.com/OpenSourceAP/CrossSection), signal `SmileSlope`.

Grades: A retail with free data and a small account; B retail with paid data, margin or more capital; C edge thin after retail costs or needs low latency; D institutional balance sheet or access; F closed or not feasible.
