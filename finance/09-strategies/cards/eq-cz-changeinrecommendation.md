# Change in recommendation

ID: `eq-cz-changeinrecommendation`
Family: Equities
Retail feasibility: **B**
As of: 2026-11-27
Bead: `bkt-q5moa.15`
Origin: Chen-Zimmermann

## Logic

Signal: Change in recommendation. Buy the stocks with the highest values and short the lowest, 20 percent tails, EW weights, rebalanced every 1 months. keep last ireccd each month, then average across analysts for each firm-month.

## Source

1. Analyzing the Analysts: When Do Recommendations Add Value?. Jegadeesh and co-authors, 2001, Crossref. https://doi.org/10.2139/ssrn.291241 (Crossref search, fetched 2026-11-27)
2. Chen and Zimmermann, Open Source Asset Pricing SignalDoc.csv, release 2026.10. https://huggingface.co/datasets/OpenSourceAP/CrossSection (web fetch, fetched 2026-11-27)

## Claimed Edge

Original paper, sample 1985 to 1998: long-short 0.23 percent a month, t-stat. Chen-Zimmermann class: predictor, predictability in original paper clear.

## Post-Publication Decay

Chen-Zimmermann replication: in-sample 1.03 percent a month, t 6.7; after publication 0.26 percent, t 2.7, 25 percent of in-sample; 2016 to 2025 0.28 percent, t 1.6.

Decay source: Open Source Cross-Sectional Asset Pricing. Chen, Zimmermann, 2020, SSRN Electronic Journal. https://doi.org/10.2139/ssrn.3604626 (Crossref search, fetched 2026-11-27)

## Capacity

Small: equal-weighted sort tilted to microcaps.

## Data Needed

[D-filings](../../03-data-sources/cards/D-filings.md), [D-market](../../03-data-sources/cards/D-market.md)

## Implementation

[OpenSourceAP/CrossSection](https://github.com/OpenSourceAP/CrossSection), signal `ChangeInRecommendation`.

Grades: A retail with free data and a small account; B retail with paid data, margin or more capital; C edge thin after retail costs or needs low latency; D institutional balance sheet or access; F closed or not feasible.
