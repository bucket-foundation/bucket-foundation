# Broker-Dealer use Beta

ID: `eq-cz-betabdleverage`
Family: Equities
Retail feasibility: **F**
As of: 2026-11-27
Bead: `bkt-q5moa.15`
Origin: Chen-Zimmermann

## Logic

Signal: Broker-Dealer use Beta. Buy the stocks with the highest values and short the lowest, 20 percent tails, VW weights, rebalanced every 12 months. Regress quarterly stock return minus 3 month treasury bill rate (tbillrate3m) on broker dealer use.

## Source

1. Financial Intermediaries and the Cross-Section of Asset Returns. Adrian and co-authors, 2011, Crossref. https://doi.org/10.2139/ssrn.1786061 (Crossref search, fetched 2026-11-27)
2. Chen and Zimmermann, Open Source Asset Pricing SignalDoc.csv, release 2026.10. https://huggingface.co/datasets/OpenSourceAP/CrossSection (web fetch, fetched 2026-11-27)

## Claimed Edge

Original paper, sample 1973 to 2009: long-short 0.32 percent a month, t-stat 1.26. Chen-Zimmermann class: placebo, predictability in original paper not.

## Post-Publication Decay

Chen-Zimmermann replication: in-sample 0.39 percent a month, t 2.2; after publication -0.38 percent, t -1.0, -97 percent of in-sample; 2016 to 2025 -0.36 percent, t -0.9.

Decay source: Open Source Cross-Sectional Asset Pricing. Chen, Zimmermann, 2020, SSRN Electronic Journal. https://doi.org/10.2139/ssrn.3604626 (Crossref search, fetched 2026-11-27)

## Capacity

Medium: liquidity-based signal.

## Data Needed

[D-market](../../03-data-sources/cards/D-market.md)

## Implementation

[OpenSourceAP/CrossSection](https://github.com/OpenSourceAP/CrossSection), signal `BetaBDLeverage`.

Grades: A retail with free data and a small account; B retail with paid data, margin or more capital; C edge thin after retail costs or needs low latency; D institutional balance sheet or access; F closed or not feasible.
