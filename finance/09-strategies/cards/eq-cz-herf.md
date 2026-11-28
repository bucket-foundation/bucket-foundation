# Industry concentration sales

ID: `eq-cz-herf`
Family: Equities
Retail feasibility: **F**
As of: 2026-11-27
Bead: `bkt-q5moa.15`
Origin: Chen-Zimmermann

## Logic

Signal: Industry concentration (sales). Buy the stocks with the lowest values and short the highest, 20 percent tails, EW weights, rebalanced every 1 months. Three-year rolling average of the three digit industry Herfindahl index based on firm revenue (sale).

## Source

1. Industry Concentration and Average Stock Returns. Hou, Robinson, 2003, SSRN Electronic Journal. https://doi.org/10.2139/ssrn.479726 (Crossref search, fetched 2026-11-27)
2. Chen and Zimmermann, Open Source Asset Pricing SignalDoc.csv, release 2026.10. https://huggingface.co/datasets/OpenSourceAP/CrossSection (web fetch, fetched 2026-11-27)

## Claimed Edge

Original paper, sample 1963 to 2001: long-short 0.26 percent a month, t-stat 2.14. Chen-Zimmermann class: predictor, predictability in original paper clear.

## Post-Publication Decay

Chen-Zimmermann replication: in-sample 0.22 percent a month, t 2.4; after publication -0.13 percent, t -1.0, -61 percent of in-sample; 2016 to 2025 -0.29 percent, t -1.5.

Decay source: Open Source Cross-Sectional Asset Pricing. Chen, Zimmermann, 2020, SSRN Electronic Journal. https://doi.org/10.2139/ssrn.3604626 (Crossref search, fetched 2026-11-27)

## Capacity

Small: equal-weighted sort tilted to microcaps.

## Data Needed

[D-filings](../../03-data-sources/cards/D-filings.md), [D-market](../../03-data-sources/cards/D-market.md)

## Implementation

[OpenSourceAP/CrossSection](https://github.com/OpenSourceAP/CrossSection), signal `Herf`.

## Merged Duplicates

- HerfBE
- HerfAsset

Grades: A retail with free data and a small account; B retail with paid data, margin or more capital; C edge thin after retail costs or needs low latency; D institutional balance sheet or access; F closed or not feasible.
