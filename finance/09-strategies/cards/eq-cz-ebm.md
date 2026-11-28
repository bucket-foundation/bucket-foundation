# Enterprise component of BM

ID: `eq-cz-ebm`
Family: Equities
Retail feasibility: **C**
As of: 2026-11-27
Bead: `bkt-q5moa.15`
Origin: Chen-Zimmermann

## Logic

Signal: Enterprise component of BM. Buy the stocks with the highest values and short the lowest, 10 percent tails, EW weights, rebalanced every 12 months. (ceq + che - dltt - dlc - dc - dvpa+ tstkp ) / (mve\_c + che - dltt - dlc - dc - dvpa+ tstkp).

## Source

1. The Book-to-Price Effect in Stock Returns: Accounting for Leverage. Penman and co-authors, 2005, Crossref. https://doi.org/10.2139/ssrn.789804 (Crossref search, fetched 2026-11-27)
2. Chen and Zimmermann, Open Source Asset Pricing SignalDoc.csv, release 2026.10. https://huggingface.co/datasets/OpenSourceAP/CrossSection (web fetch, fetched 2026-11-27)

## Claimed Edge

Original paper, sample 1963 to 2001: long-short 0.12 percent a month, t-stat 3.0. Chen-Zimmermann class: predictor, predictability in original paper clear.

## Post-Publication Decay

Chen-Zimmermann replication: in-sample 0.30 percent a month, t 4.1; after publication 0.21 percent, t 1.8, 69 percent of in-sample; 2016 to 2025 0.37 percent, t 2.1.

Decay source: Open Source Cross-Sectional Asset Pricing. Chen, Zimmermann, 2020, SSRN Electronic Journal. https://doi.org/10.2139/ssrn.3604626 (Crossref search, fetched 2026-11-27)

## Capacity

Small: equal-weighted sort tilted to microcaps.

## Data Needed

[D-filings](../../03-data-sources/cards/D-filings.md), [D-market](../../03-data-sources/cards/D-market.md)

## Implementation

[OpenSourceAP/CrossSection](https://github.com/OpenSourceAP/CrossSection), signal `EBM`.

## Merged Duplicates

- EBM_q

Grades: A retail with free data and a small account; B retail with paid data, margin or more capital; C edge thin after retail costs or needs low latency; D institutional balance sheet or access; F closed or not feasible.
