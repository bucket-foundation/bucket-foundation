# Enterprise Multiple

ID: `eq-cz-entmult`
Family: Equities
Retail feasibility: **C**
As of: 2026-11-27
Bead: `bkt-q5moa.15`
Origin: Chen-Zimmermann

## Logic

Signal: Enterprise Multiple. Buy the stocks with the lowest values and short the highest, 10 percent tails, EW weights, rebalanced every 12 months. Market value of equity + long-term debt (dltt) + debt in current liabilities (dlc) + deferred charges (dc) - cash and short-term investments (che), divided by operating income (oibdp).

## Source

1. New Evidence on the Relation between the Enterprise Multiple and Average Stock Returns. Loughran, Wellman, 2011, Journal of Financial and Quantitative Analysis. https://doi.org/10.1017/s0022109011000445 (Crossref search, fetched 2026-11-27)
2. Chen and Zimmermann, Open Source Asset Pricing SignalDoc.csv, release 2026.10. https://huggingface.co/datasets/OpenSourceAP/CrossSection (web fetch, fetched 2026-11-27)

## Claimed Edge

Original paper, sample 1963 to 2009: long-short 0.95 percent a month, t-stat 6.54. Chen-Zimmermann class: predictor, predictability in original paper clear.

## Post-Publication Decay

Chen-Zimmermann replication: in-sample 0.85 percent a month, t 5.5; after publication 0.24 percent, t 0.8, 28 percent of in-sample; 2016 to 2025 0.24 percent, t 0.6.

Decay source: Open Source Cross-Sectional Asset Pricing. Chen, Zimmermann, 2020, SSRN Electronic Journal. https://doi.org/10.2139/ssrn.3604626 (Crossref search, fetched 2026-11-27)

## Capacity

Small: equal-weighted sort tilted to microcaps.

## Data Needed

[D-filings](../../03-data-sources/cards/D-filings.md), [D-market](../../03-data-sources/cards/D-market.md)

## Implementation

[OpenSourceAP/CrossSection](https://github.com/OpenSourceAP/CrossSection), signal `EntMult`.

## Merged Duplicates

- EntMult_q

Grades: A retail with free data and a small account; B retail with paid data, margin or more capital; C edge thin after retail costs or needs low latency; D institutional balance sheet or access; F closed or not feasible.
