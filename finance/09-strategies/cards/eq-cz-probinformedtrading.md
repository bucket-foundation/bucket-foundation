# Probability of Informed Trading

ID: `eq-cz-probinformedtrading`
Family: Equities
Retail feasibility: **F**
As of: 2026-11-27
Bead: `bkt-q5moa.15`
Origin: Chen-Zimmermann

## Logic

Signal: Probability of Informed Trading. Buy the stocks with the highest values and short the lowest, 20 percent tails, EW weights, rebalanced every 1 months. Download parameter estimates from the archived version of Hvidkjaers website (https://web.archive.org/web/20110219024112/http://sites.google.com/site/hvidkjaer/data/data-files/pin1983-2001.zip?attredirects=0), and the page for Duarte, Hu, Young, JFE 2020 https://edwinhu.github.io/pin/ and apply Easley et al's Equation 5.

## Source

1. Is Information Risk a Determinant of Asset Returns?. Easley and co-authors, 2000, Crossref. https://doi.org/10.2139/ssrn.249072 (Crossref search, fetched 2026-11-27)
2. Chen and Zimmermann, Open Source Asset Pricing SignalDoc.csv, release 2026.10. https://huggingface.co/datasets/OpenSourceAP/CrossSection (web fetch, fetched 2026-11-27)

## Claimed Edge

Original paper, sample 1984 to 1998: t=2.5 in mv reg. Chen-Zimmermann class: predictor, predictability in original paper likely.

## Post-Publication Decay

Chen-Zimmermann replication: in-sample 1.60 percent a month, t 2.4; after publication 0.17 percent, t 0.2, 11 percent of in-sample.

Decay source: Open Source Cross-Sectional Asset Pricing. Chen, Zimmermann, 2020, SSRN Electronic Journal. https://doi.org/10.2139/ssrn.3604626 (Crossref search, fetched 2026-11-27)

## Capacity

Small: equal-weighted sort tilted to microcaps.

## Data Needed

[D-market](../../03-data-sources/cards/D-market.md)

## Implementation

[OpenSourceAP/CrossSection](https://github.com/OpenSourceAP/CrossSection), signal `ProbInformedTrading`.

Grades: A retail with free data and a small account; B retail with paid data, margin or more capital; C edge thin after retail costs or needs low latency; D institutional balance sheet or access; F closed or not feasible.
