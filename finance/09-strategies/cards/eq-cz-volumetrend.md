# Volume Trend

ID: `eq-cz-volumetrend`
Family: Equities
Retail feasibility: **B**
As of: 2026-11-27
Bead: `bkt-q5moa.15`
Origin: Chen-Zimmermann

## Logic

Signal: Volume Trend. Buy the stocks with the lowest values and short the highest, 20 percent tails, EW weights, rebalanced every 12 months. Rolling coefficient from regressing monthly trading volume on a linear time trend over a window of 60 months (require that at least 30 exist).

## Source

1. Commonality in the determinants of expected stock returns. Haugen, Baker, 1996, Journal of Financial Economics. https://doi.org/10.1016/0304-405x(95)00868-f (Crossref search, fetched 2026-11-27)
2. Chen and Zimmermann, Open Source Asset Pricing SignalDoc.csv, release 2026.10. https://huggingface.co/datasets/OpenSourceAP/CrossSection (web fetch, fetched 2026-11-27)

## Claimed Edge

Original paper, sample 1979 to 1993: t=3 in mv reg nonstandard. Chen-Zimmermann class: predictor, predictability in original paper likely.

## Post-Publication Decay

Chen-Zimmermann replication: in-sample 0.55 percent a month, t 3.0; after publication 0.65 percent, t 5.0, 118 percent of in-sample; 2016 to 2025 0.41 percent, t 2.4.

Decay source: Open Source Cross-Sectional Asset Pricing. Chen, Zimmermann, 2020, SSRN Electronic Journal. https://doi.org/10.2139/ssrn.3604626 (Crossref search, fetched 2026-11-27)

## Capacity

Small: equal-weighted sort tilted to microcaps.

## Data Needed

[D-market](../../03-data-sources/cards/D-market.md)

## Implementation

[OpenSourceAP/CrossSection](https://github.com/OpenSourceAP/CrossSection), signal `VolumeTrend`.

Grades: A retail with free data and a small account; B retail with paid data, margin or more capital; C edge thin after retail costs or needs low latency; D institutional balance sheet or access; F closed or not feasible.
