# Composite debt issuance

ID: `eq-cz-compositedebtissuance`
Family: Equities
Retail feasibility: **C**
As of: 2026-11-27
Bead: `bkt-q5moa.15`
Origin: Chen-Zimmermann

## Logic

Signal: Composite debt issuance. Buy the stocks with the lowest values and short the highest, 33 percent tails, EW weights, rebalanced every 12 months. Log of long-term debt (dltt) plus debt in current liabilties (dlc) minus log of the same variable 5 years ago.

## Source

1. The New Issues Puzzle: Testing the Investment-Based Explanation. Lyandres and co-authors, 2007, Review of Financial Studies. https://doi.org/10.1093/rfs/hhm058 (Crossref search, fetched 2026-11-27)
2. Chen and Zimmermann, Open Source Asset Pricing SignalDoc.csv, release 2026.10. https://huggingface.co/datasets/OpenSourceAP/CrossSection (web fetch, fetched 2026-11-27)

## Claimed Edge

Original paper, sample 1970 to 2005: long-short 0.52 percent a month, t-stat 8.59. Chen-Zimmermann class: predictor, predictability in original paper clear.

## Post-Publication Decay

Chen-Zimmermann replication: in-sample 0.31 percent a month, t 5.2; after publication 0.10 percent, t 1.1, 31 percent of in-sample; 2016 to 2025 -0.10 percent, t -0.9.

Decay source: Open Source Cross-Sectional Asset Pricing. Chen, Zimmermann, 2020, SSRN Electronic Journal. https://doi.org/10.2139/ssrn.3604626 (Crossref search, fetched 2026-11-27)

## Capacity

Small: equal-weighted sort tilted to microcaps.

## Data Needed

[D-filings](../../03-data-sources/cards/D-filings.md), [D-market](../../03-data-sources/cards/D-market.md)

## Implementation

[OpenSourceAP/CrossSection](https://github.com/OpenSourceAP/CrossSection), signal `CompositeDebtIssuance`.

Grades: A retail with free data and a small account; B retail with paid data, margin or more capital; C edge thin after retail costs or needs low latency; D institutional balance sheet or access; F closed or not feasible.
