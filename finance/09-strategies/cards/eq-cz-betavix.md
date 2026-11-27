# Systematic volatility

ID: `eq-cz-betavix`
Family: Equities
Retail feasibility: **F**
As of: 2026-11-27
Bead: `bkt-q5moa.15`
Origin: Chen-Zimmermann

## Logic

Signal: Systematic volatility. Buy the stocks with the lowest values and short the highest, 20 percent tails, VW weights, rebalanced every 1 months. Coefficient on daily change in the VIX of a 1-month rolling window regression of daily stock excess returns on market return and the daily change in the CBOE S&P 100 volatility index (downloaded from FRED).

## Source

1. The Cross‐Section of Volatility and Expected Returns. ANG and co-authors, 2006, The Journal of Finance. https://doi.org/10.1111/j.1540-6261.2006.00836.x (Crossref search, fetched 2026-11-27)
2. Chen and Zimmermann, Open Source Asset Pricing SignalDoc.csv, release 2026.10. https://huggingface.co/datasets/OpenSourceAP/CrossSection (web fetch, fetched 2026-11-27)

## Claimed Edge

Original paper, sample 1986 to 2000: long-short 1.04 percent a month, t-stat 3.9. Chen-Zimmermann class: predictor, predictability in original paper clear.

## Post-Publication Decay

Chen-Zimmermann replication: in-sample 1.08 percent a month, t 3.6; after publication 0.10 percent, t 0.4, 9 percent of in-sample; 2016 to 2025 0.12 percent, t 0.3.

Decay source: Open Source Cross-Sectional Asset Pricing. Chen, Zimmermann, 2020, SSRN Electronic Journal. https://doi.org/10.2139/ssrn.3604626 (Crossref search, fetched 2026-11-27)

## Capacity

Large: value-weighted sort.

## Data Needed

[D-market](../../03-data-sources/cards/D-market.md)

## Implementation

[OpenSourceAP/CrossSection](https://github.com/OpenSourceAP/CrossSection), signal `betaVIX`.

Grades: A retail with free data and a small account; B retail with paid data, margin or more capital; C edge thin after retail costs or needs low latency; D institutional balance sheet or access; F closed or not feasible.
