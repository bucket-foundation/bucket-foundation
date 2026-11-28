# Change in Net Working Capital

ID: `eq-cz-chnwc`
Family: Equities
Retail feasibility: **C**
As of: 2026-11-27
Bead: `bkt-q5moa.15`
Origin: Chen-Zimmermann

## Logic

Signal: Change in Net Working Capital. Buy the stocks with the lowest values and short the highest, 20 percent tails, EW weights, rebalanced every 12 months. Twelve-month change in net working capital.

## Source

1. The Use of Dupont Analysis by Market Participants. Soliman, 2008, Crossref. https://doi.org/10.2139/ssrn.1101981 (Crossref search, fetched 2026-11-27)
2. Chen and Zimmermann, Open Source Asset Pricing SignalDoc.csv, release 2026.10. https://huggingface.co/datasets/OpenSourceAP/CrossSection (web fetch, fetched 2026-11-27)

## Claimed Edge

Original paper, sample 1984 to 2002: t=4.6 in mv reg. Chen-Zimmermann class: predictor, predictability in original paper clear.

## Post-Publication Decay

Chen-Zimmermann replication: in-sample 0.15 percent a month, t 2.6; after publication 0.06 percent, t 0.8, 38 percent of in-sample; 2016 to 2025 0.15 percent, t 1.6.

Decay source: Open Source Cross-Sectional Asset Pricing. Chen, Zimmermann, 2020, SSRN Electronic Journal. https://doi.org/10.2139/ssrn.3604626 (Crossref search, fetched 2026-11-27)

## Capacity

Small: equal-weighted sort tilted to microcaps.

## Data Needed

[D-filings](../../03-data-sources/cards/D-filings.md), [D-market](../../03-data-sources/cards/D-market.md)

## Implementation

[OpenSourceAP/CrossSection](https://github.com/OpenSourceAP/CrossSection), signal `ChNWC`.

Grades: A retail with free data and a small account; B retail with paid data, margin or more capital; C edge thin after retail costs or needs low latency; D institutional balance sheet or access; F closed or not feasible.
