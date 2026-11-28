# Revenue Growth Rank

ID: `eq-cz-meanrankrevgrowth`
Family: Equities
Retail feasibility: **F**
As of: 2026-11-27
Bead: `bkt-q5moa.15`
Origin: Chen-Zimmermann

## Logic

Signal: Revenue Growth Rank. Buy the stocks with the highest values and short the lowest, 20 percent tails, EW weights, rebalanced every 12 months. Rank firms by their annual revenue growth each year over the past 5 years.

## Source

1. Contrarian Investment, Extrapolation, and Risk. Lakonishok and co-authors, 1993, Crossref. https://doi.org/10.3386/w4360 (Crossref search, fetched 2026-11-27)
2. Chen and Zimmermann, Open Source Asset Pricing SignalDoc.csv, release 2026.10. https://huggingface.co/datasets/OpenSourceAP/CrossSection (web fetch, fetched 2026-11-27)

## Claimed Edge

Original paper, sample 1968 to 1990: t=4.5 in double sort. Chen-Zimmermann class: predictor, predictability in original paper clear.

## Post-Publication Decay

Chen-Zimmermann replication: in-sample 0.55 percent a month, t 3.9; after publication 0.04 percent, t 0.3, 6 percent of in-sample; 2016 to 2025 0.07 percent, t 0.3.

Decay source: Open Source Cross-Sectional Asset Pricing. Chen, Zimmermann, 2020, SSRN Electronic Journal. https://doi.org/10.2139/ssrn.3604626 (Crossref search, fetched 2026-11-27)

## Capacity

Small: equal-weighted sort tilted to microcaps.

## Data Needed

[D-filings](../../03-data-sources/cards/D-filings.md), [D-market](../../03-data-sources/cards/D-market.md)

## Implementation

[OpenSourceAP/CrossSection](https://github.com/OpenSourceAP/CrossSection), signal `MeanRankRevGrowth`.

Grades: A retail with free data and a small account; B retail with paid data, margin or more capital; C edge thin after retail costs or needs low latency; D institutional balance sheet or access; F closed or not feasible.
