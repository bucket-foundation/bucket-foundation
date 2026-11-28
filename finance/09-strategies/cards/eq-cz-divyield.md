# Dividend yield for small stocks

ID: `eq-cz-divyield`
Family: Equities
Retail feasibility: **C**
As of: 2026-11-27
Bead: `bkt-q5moa.15`
Origin: Chen-Zimmermann

## Logic

Signal: Dividend yield for small stocks. Buy the stocks with the highest values and short the lowest, 25 percent tails, EW weights, rebalanced every 1 months. Define tempDY as 4 times latest dividend (divamt) divided by price (prc).

## Source

1. Stock Returns, Dividend Yields, and Taxes. Naranjo and co-authors, 1998, The Journal of Finance. https://doi.org/10.1111/0022-1082.00082 (Crossref search, fetched 2026-11-27)
2. Chen and Zimmermann, Open Source Asset Pricing SignalDoc.csv, release 2026.10. https://huggingface.co/datasets/OpenSourceAP/CrossSection (web fetch, fetched 2026-11-27)

## Claimed Edge

Original paper, sample 1963 to 1994: mixed results, small spread. Chen-Zimmermann class: placebo, predictability in original paper indirect.

## Post-Publication Decay

Chen-Zimmermann replication: in-sample 0.35 percent a month, t 1.6; after publication 0.17 percent, t 1.0, 47 percent of in-sample; 2016 to 2025 0.20 percent, t 0.7.

Decay source: Open Source Cross-Sectional Asset Pricing. Chen, Zimmermann, 2020, SSRN Electronic Journal. https://doi.org/10.2139/ssrn.3604626 (Crossref search, fetched 2026-11-27)

## Capacity

Small: equal-weighted sort tilted to microcaps.

## Data Needed

[D-filings](../../03-data-sources/cards/D-filings.md), [D-market](../../03-data-sources/cards/D-market.md)

## Implementation

[OpenSourceAP/CrossSection](https://github.com/OpenSourceAP/CrossSection), signal `DivYield`.

## Merged Duplicates

- DivYieldAnn

Grades: A retail with free data and a small account; B retail with paid data, margin or more capital; C edge thin after retail costs or needs low latency; D institutional balance sheet or access; F closed or not feasible.
