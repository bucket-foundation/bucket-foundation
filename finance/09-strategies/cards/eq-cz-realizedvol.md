# Realized Total Volatility

ID: `eq-cz-realizedvol`
Family: Equities
Retail feasibility: **F**
As of: 2026-11-27
Bead: `bkt-q5moa.15`
Origin: Chen-Zimmermann

## Logic

Signal: Realized (Total) Volatility. Buy the stocks with the lowest values and short the highest, 20 percent tails, VW weights, rebalanced every 1 months. Standard deviation of residuals from CAPM regressions using the past month of daily data.

## Source

1. The Cross‐Section of Volatility and Expected Returns. ANG and co-authors, 2006, The Journal of Finance. https://doi.org/10.1111/j.1540-6261.2006.00836.x (Crossref search, fetched 2026-11-27)
2. Chen and Zimmermann, Open Source Asset Pricing SignalDoc.csv, release 2026.10. https://huggingface.co/datasets/OpenSourceAP/CrossSection (web fetch, fetched 2026-11-27)

## Claimed Edge

Original paper, sample 1963 to 2000: long-short 0.97 percent a month, t-stat 2.86. Chen-Zimmermann class: predictor, predictability in original paper clear.

## Post-Publication Decay

Chen-Zimmermann replication: in-sample 0.84 percent a month, t 2.6; after publication -0.07 percent, t -0.1, -8 percent of in-sample; 2016 to 2025 -0.53 percent, t -0.8.

Decay source: Open Source Cross-Sectional Asset Pricing. Chen, Zimmermann, 2020, SSRN Electronic Journal. https://doi.org/10.2139/ssrn.3604626 (Crossref search, fetched 2026-11-27)

## Capacity

Large: value-weighted sort.

## Data Needed

[D-market](../../03-data-sources/cards/D-market.md)

## Implementation

[OpenSourceAP/CrossSection](https://github.com/OpenSourceAP/CrossSection), signal `RealizedVol`.

## Merged Duplicates

- Quantpedia low-volatility-factor-effect-in-stocks

Grades: A retail with free data and a small account; B retail with paid data, margin or more capital; C edge thin after retail costs or needs low latency; D institutional balance sheet or access; F closed or not feasible.
