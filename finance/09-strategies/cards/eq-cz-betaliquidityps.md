# Pastor-Stambaugh liquidity beta

ID: `eq-cz-betaliquidityps`
Family: Equities
Retail feasibility: **F**
As of: 2026-11-27
Bead: `bkt-q5moa.15`
Origin: Chen-Zimmermann

## Logic

Signal: Pastor-Stambaugh liquidity beta. Buy the stocks with the highest values and short the lowest, 10 percent tails, VW weights, rebalanced every 12 months. Monthly excess return (ret -rf) regressed on innovations in liquidity from Pastor's website (\url{https://faculty.chicagobooth.edu/lubos.pastor/research/liq_data_1962_2018.txt}).

## Source

1. Liquidity Risk and Expected Stock Returns. Pastor, Stambaugh, 2001, Crossref. https://doi.org/10.3386/w8462 (Crossref search, fetched 2026-11-27)
2. Chen and Zimmermann, Open Source Asset Pricing SignalDoc.csv, release 2026.10. https://huggingface.co/datasets/OpenSourceAP/CrossSection (web fetch, fetched 2026-11-27)

## Claimed Edge

Original paper, sample 1968 to 1999: long-short 0.53 percent a month, t-stat 2.54. Chen-Zimmermann class: predictor, predictability in original paper clear.

## Post-Publication Decay

Chen-Zimmermann replication: in-sample 0.32 percent a month, t 1.8; after publication 0.02 percent, t 0.1, 7 percent of in-sample; 2016 to 2025 -0.32 percent, t -1.1.

Decay source: Open Source Cross-Sectional Asset Pricing. Chen, Zimmermann, 2020, SSRN Electronic Journal. https://doi.org/10.2139/ssrn.3604626 (Crossref search, fetched 2026-11-27)

## Capacity

Large: value-weighted sort.

## Data Needed

[D-market](../../03-data-sources/cards/D-market.md)

## Implementation

[OpenSourceAP/CrossSection](https://github.com/OpenSourceAP/CrossSection), signal `BetaLiquidityPS`.

Grades: A retail with free data and a small account; B retail with paid data, margin or more capital; C edge thin after retail costs or needs low latency; D institutional balance sheet or access; F closed or not feasible.
