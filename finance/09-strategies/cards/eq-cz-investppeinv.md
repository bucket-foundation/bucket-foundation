# Change in ppe and inv/assets

ID: `eq-cz-investppeinv`
Family: Equities
Retail feasibility: **C**
As of: 2026-11-27
Bead: `bkt-q5moa.15`
Origin: Chen-Zimmermann

## Logic

Signal: change in ppe and inv/assets. Buy the stocks with the lowest values and short the highest, 30 percent tails, EW weights, rebalanced every 1 months. One-year change in property, plants and equipment (ppegt) plus one year change in inventory (invt), scaled by one-year lagged assets (at).

## Source

1. The New Issues Puzzle: Testing the Investment-Based Explanation. Lyandres and co-authors, 2007, Review of Financial Studies. https://doi.org/10.1093/rfs/hhm058 (Crossref search, fetched 2026-11-27)
2. Chen and Zimmermann, Open Source Asset Pricing SignalDoc.csv, release 2026.10. https://huggingface.co/datasets/OpenSourceAP/CrossSection (web fetch, fetched 2026-11-27)

## Claimed Edge

Original paper, sample 1970 to 2005: long-short 0.57 percent a month, t-stat 7.13. Chen-Zimmermann class: predictor, predictability in original paper clear.

## Post-Publication Decay

Chen-Zimmermann replication: in-sample 0.80 percent a month, t 8.0; after publication 0.19 percent, t 1.7, 24 percent of in-sample; 2016 to 2025 -0.02 percent, t -0.2.

Decay source: Open Source Cross-Sectional Asset Pricing. Chen, Zimmermann, 2020, SSRN Electronic Journal. https://doi.org/10.2139/ssrn.3604626 (Crossref search, fetched 2026-11-27)

## Capacity

Small: equal-weighted sort tilted to microcaps.

## Data Needed

[D-filings](../../03-data-sources/cards/D-filings.md), [D-market](../../03-data-sources/cards/D-market.md)

## Implementation

[OpenSourceAP/CrossSection](https://github.com/OpenSourceAP/CrossSection), signal `InvestPPEInv`.

Grades: A retail with free data and a small account; B retail with paid data, margin or more capital; C edge thin after retail costs or needs low latency; D institutional balance sheet or access; F closed or not feasible.
