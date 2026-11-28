# Organizational capital

ID: `eq-cz-orgcap`
Family: Equities
Retail feasibility: **C**
As of: 2026-11-27
Bead: `bkt-q5moa.15`
Origin: Chen-Zimmermann

## Logic

Signal: Organizational capital. Buy the stocks with the highest values and short the lowest, 20 percent tails, VW weights, rebalanced every 12 months. Defined recursively.

## Source

1. Organization Capital and the Cross‐Section of Expected Returns. EISFELDT, PAPANIKOLAOU, 2013, The Journal of Finance. https://doi.org/10.1111/jofi.12034 (Crossref search, fetched 2026-11-27)
2. Chen and Zimmermann, Open Source Asset Pricing SignalDoc.csv, release 2026.10. https://huggingface.co/datasets/OpenSourceAP/CrossSection (web fetch, fetched 2026-11-27)

## Claimed Edge

Original paper, sample 1970 to 2008: long-short 0.39 percent a month, t-stat 2.85. Chen-Zimmermann class: predictor, predictability in original paper clear.

## Post-Publication Decay

Chen-Zimmermann replication: in-sample 0.39 percent a month, t 2.8; after publication 0.26 percent, t 1.2, 67 percent of in-sample; 2016 to 2025 0.36 percent, t 1.4.

Decay source: Open Source Cross-Sectional Asset Pricing. Chen, Zimmermann, 2020, SSRN Electronic Journal. https://doi.org/10.2139/ssrn.3604626 (Crossref search, fetched 2026-11-27)

## Capacity

Large: value-weighted sort.

## Data Needed

[D-filings](../../03-data-sources/cards/D-filings.md), [D-market](../../03-data-sources/cards/D-market.md)

## Implementation

[OpenSourceAP/CrossSection](https://github.com/OpenSourceAP/CrossSection), signal `OrgCap`.

## Merged Duplicates

- OrgCapNoAdj

Grades: A retail with free data and a small account; B retail with paid data, margin or more capital; C edge thin after retail costs or needs low latency; D institutional balance sheet or access; F closed or not feasible.
