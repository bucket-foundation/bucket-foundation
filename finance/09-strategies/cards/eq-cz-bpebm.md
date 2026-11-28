# use component of BM

ID: `eq-cz-bpebm`
Family: Equities
Retail feasibility: **F**
As of: 2026-11-27
Bead: `bkt-q5moa.15`
Origin: Chen-Zimmermann

## Logic

Signal: use component of BM. Buy the stocks with the lowest values and short the highest, 20 percent tails, EW weights, rebalanced every 12 months. BP - EBM, where BP = (ceq + tstkp - dvpa)/(shrout*abs(prc)), and EBM is defined above.

## Source

1. The Book-to-Price Effect in Stock Returns: Accounting for Leverage. Penman and co-authors, 2005, Crossref. https://doi.org/10.2139/ssrn.789804 (Crossref search, fetched 2026-11-27)
2. Chen and Zimmermann, Open Source Asset Pricing SignalDoc.csv, release 2026.10. https://huggingface.co/datasets/OpenSourceAP/CrossSection (web fetch, fetched 2026-11-27)

## Claimed Edge

Original paper, sample 1963 to 2001: t=4.1 in univariate reg. Chen-Zimmermann class: predictor, predictability in original paper clear.

## Post-Publication Decay

Chen-Zimmermann replication: in-sample 0.22 percent a month, t 2.8; after publication -0.00 percent, t -0.0, -0 percent of in-sample; 2016 to 2025 -0.07 percent, t -0.3.

Decay source: Open Source Cross-Sectional Asset Pricing. Chen, Zimmermann, 2020, SSRN Electronic Journal. https://doi.org/10.2139/ssrn.3604626 (Crossref search, fetched 2026-11-27)

## Capacity

Small: equal-weighted sort tilted to microcaps.

## Data Needed

[D-filings](../../03-data-sources/cards/D-filings.md), [D-market](../../03-data-sources/cards/D-market.md)

## Implementation

[OpenSourceAP/CrossSection](https://github.com/OpenSourceAP/CrossSection), signal `BPEBM`.

Grades: A retail with free data and a small account; B retail with paid data, margin or more capital; C edge thin after retail costs or needs low latency; D institutional balance sheet or access; F closed or not feasible.
