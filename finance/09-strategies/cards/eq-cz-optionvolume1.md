# Option to stock volume

ID: `eq-cz-optionvolume1`
Family: Equities
Retail feasibility: **F**
As of: 2026-11-27
Bead: `bkt-q5moa.15`
Origin: Chen-Zimmermann

## Logic

Signal: Option to stock volume. Buy the stocks with the lowest values and short the highest, 20 percent tails, EW weights, rebalanced every 1 months. Total monthly option volume (volume) over all puts and calls, divided by monthly stock trading volume (vol).

## Source

1. The Option to Stock Volume Ratio and Future Returns. Johnson, So, 2010, Crossref. https://doi.org/10.2139/ssrn.1624062 (Crossref search, fetched 2026-11-27)
2. Chen and Zimmermann, Open Source Asset Pricing SignalDoc.csv, release 2026.10. https://huggingface.co/datasets/OpenSourceAP/CrossSection (web fetch, fetched 2026-11-27)

## Claimed Edge

Original paper, sample 1996 to 2010: long-short 0.92 percent a month, t-stat 3.45. Chen-Zimmermann class: predictor, predictability in original paper clear.

## Post-Publication Decay

Chen-Zimmermann replication: in-sample 0.75 percent a month, t 2.1; after publication -0.01 percent, t -0.0, -1 percent of in-sample; 2016 to 2025 -0.06 percent, t -0.2.

Decay source: Open Source Cross-Sectional Asset Pricing. Chen, Zimmermann, 2020, SSRN Electronic Journal. https://doi.org/10.2139/ssrn.3604626 (Crossref search, fetched 2026-11-27)

## Capacity

Small: equal-weighted sort tilted to microcaps.

## Data Needed

[D-market](../../03-data-sources/cards/D-market.md)

## Implementation

[OpenSourceAP/CrossSection](https://github.com/OpenSourceAP/CrossSection), signal `OptionVolume1`.

## Merged Duplicates

- OptionVolume2

Grades: A retail with free data and a small account; B retail with paid data, margin or more capital; C edge thin after retail costs or needs low latency; D institutional balance sheet or access; F closed or not feasible.
