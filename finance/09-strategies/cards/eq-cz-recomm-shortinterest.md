# Analyst Recommendations and Short-Interest

ID: `eq-cz-recomm-shortinterest`
Family: Equities
Retail feasibility: **C**
As of: 2026-11-27
Bead: `bkt-q5moa.15`
Origin: Chen-Zimmermann

## Logic

Signal: Analyst Recommendations and Short-Interest. Buy the stocks with the highest values and short the lowest, 20 percent tails, EW weights, rebalanced every 1 months. Go long firms in lowest quintile of short interest (shortint/shrout) and lowest quintile of analyst recommendations (monthly consensus recommendation using the most recent analyst recommendation in the past 12 months).

## Source

1. Should Investors Follow the Prophets or the Bears? Evidence on the Use of Public Information by Analysts and Short Sellers. Drake and co-authors, 2011, The Accounting Review. https://doi.org/10.2308/accr.00000006 (Crossref search, fetched 2026-11-27)
2. Chen and Zimmermann, Open Source Asset Pricing SignalDoc.csv, release 2026.10. https://huggingface.co/datasets/OpenSourceAP/CrossSection (web fetch, fetched 2026-11-27)

## Claimed Edge

Original paper, sample 1994 to 2006: long-short 1.11 percent a month, t-stat 4.09. Chen-Zimmermann class: predictor, predictability in original paper clear.

## Post-Publication Decay

Chen-Zimmermann replication: in-sample 0.83 percent a month, t 3.0; after publication 0.37 percent, t 1.0, 44 percent of in-sample; 2016 to 2025 0.45 percent, t 0.9.

Decay source: Open Source Cross-Sectional Asset Pricing. Chen, Zimmermann, 2020, SSRN Electronic Journal. https://doi.org/10.2139/ssrn.3604626 (Crossref search, fetched 2026-11-27)

## Capacity

Small: equal-weighted sort tilted to microcaps.

## Data Needed

[D-filings](../../03-data-sources/cards/D-filings.md), [D-market](../../03-data-sources/cards/D-market.md)

## Implementation

[OpenSourceAP/CrossSection](https://github.com/OpenSourceAP/CrossSection), signal `Recomm_ShortInterest`.

Grades: A retail with free data and a small account; B retail with paid data, margin or more capital; C edge thin after retail costs or needs low latency; D institutional balance sheet or access; F closed or not feasible.
