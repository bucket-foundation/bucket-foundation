# Off season long-term reversal

ID: `eq-cz-momoffseason`
Family: Equities
Retail feasibility: **C**
As of: 2026-11-27
Bead: `bkt-q5moa.15`
Origin: Chen-Zimmermann

## Logic

Signal: Off season long-term reversal. Buy the stocks with the lowest values and short the highest, 10 percent tails, EW weights, rebalanced every 1 months. Average return in other months over the preceding 2-5 years.

## Source

1. Seasonality in the cross-section of stock returns☆. HESTON, SADKA, 2008, Journal of Financial Economics. https://doi.org/10.1016/j.jfineco.2007.02.003 (Crossref search, fetched 2026-11-27)
2. Chen and Zimmermann, Open Source Asset Pricing SignalDoc.csv, release 2026.10. https://huggingface.co/datasets/OpenSourceAP/CrossSection (web fetch, fetched 2026-11-27)

## Claimed Edge

Original paper, sample 1965 to 2002: long-short 1.25 percent a month, t-stat 5.6. Chen-Zimmermann class: predictor, predictability in original paper clear.

## Post-Publication Decay

Chen-Zimmermann replication: in-sample 1.28 percent a month, t 5.2; after publication 0.28 percent, t 0.7, 22 percent of in-sample; 2016 to 2025 0.37 percent, t 0.7.

Decay source: Open Source Cross-Sectional Asset Pricing. Chen, Zimmermann, 2020, SSRN Electronic Journal. https://doi.org/10.2139/ssrn.3604626 (Crossref search, fetched 2026-11-27)

## Capacity

Small: equal-weighted sort tilted to microcaps.

## Data Needed

[D-market](../../03-data-sources/cards/D-market.md)

## Implementation

[OpenSourceAP/CrossSection](https://github.com/OpenSourceAP/CrossSection), signal `MomOffSeason`.

## Merged Duplicates

- MomOffSeason06YrPlus
- MomOffSeason16YrPlus
- MomOffSeason11YrPlus

Grades: A retail with free data and a small account; B retail with paid data, margin or more capital; C edge thin after retail costs or needs low latency; D institutional balance sheet or access; F closed or not feasible.
