# Intermediate Momentum

ID: `eq-cz-intmom`
Family: Equities
Retail feasibility: **C**
As of: 2026-11-27
Bead: `bkt-q5moa.15`
Origin: Chen-Zimmermann

## Logic

Signal: Intermediate Momentum. Buy the stocks with the highest values and short the lowest, 10 percent tails, VW weights, rebalanced every 1 months. Stock return between months t-12 and t-6

## Source

1. Is momentum momentum?. Novy-Marx, 2012, Journal of Financial Economics. https://doi.org/10.1016/j.jfineco.2011.05.003 (Crossref search, fetched 2026-11-27)
2. Chen and Zimmermann, Open Source Asset Pricing SignalDoc.csv, release 2026.10. https://huggingface.co/datasets/OpenSourceAP/CrossSection (web fetch, fetched 2026-11-27)

## Claimed Edge

Original paper, sample 1927 to 2010: long-short 1.20 percent a month, t-stat 5.79. Chen-Zimmermann class: predictor, predictability in original paper clear.

## Post-Publication Decay

Chen-Zimmermann replication: in-sample 1.26 percent a month, t 6.1; after publication 0.58 percent, t 1.0, 46 percent of in-sample; 2016 to 2025 0.37 percent, t 0.5.

Decay source: Open Source Cross-Sectional Asset Pricing. Chen, Zimmermann, 2020, SSRN Electronic Journal. https://doi.org/10.2139/ssrn.3604626 (Crossref search, fetched 2026-11-27)

## Capacity

Large: value-weighted sort.

## Data Needed

[D-market](../../03-data-sources/cards/D-market.md)

## Implementation

[OpenSourceAP/CrossSection](https://github.com/OpenSourceAP/CrossSection), signal `IntMom`.

Grades: A retail with free data and a small account; B retail with paid data, margin or more capital; C edge thin after retail costs or needs low latency; D institutional balance sheet or access; F closed or not feasible.
