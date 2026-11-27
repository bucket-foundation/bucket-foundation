# Payout Yield

ID: `eq-cz-payoutyield`
Family: Equities
Retail feasibility: **C**
As of: 2026-11-27
Bead: `bkt-q5moa.15`
Origin: Chen-Zimmermann

## Logic

Signal: Payout Yield. Buy the stocks with the highest values and short the lowest, 10 percent tails, EW weights, rebalanced every 12 months. Sum of dividends (dvc), purchase of common and preferred stock (prstkc) and max(pstkrv lagged 12 months minus pstkrv, 0), with an unavailable preferred-stock difference treated as zero, over market value of equity lagged 6 months.

## Source

1. On the Importance of Measuring Payout Yield: Implications for Empirical Asset Pricing. BOUDOUKH and co-authors, 2007, The Journal of Finance. https://doi.org/10.1111/j.1540-6261.2007.01226.x (Crossref search, fetched 2026-11-27)
2. Chen and Zimmermann, Open Source Asset Pricing SignalDoc.csv, release 2026.10. https://huggingface.co/datasets/OpenSourceAP/CrossSection (web fetch, fetched 2026-11-27)

## Claimed Edge

Original paper, sample 1984 to 2003: long-short 0.52 percent a month, t-stat. Chen-Zimmermann class: predictor, predictability in original paper clear.

## Post-Publication Decay

Chen-Zimmermann replication: in-sample 0.67 percent a month, t 4.2; after publication 0.26 percent, t 1.2, 39 percent of in-sample; 2016 to 2025 0.17 percent, t 0.5.

Decay source: Open Source Cross-Sectional Asset Pricing. Chen, Zimmermann, 2020, SSRN Electronic Journal. https://doi.org/10.2139/ssrn.3604626 (Crossref search, fetched 2026-11-27)

## Capacity

Small: equal-weighted sort tilted to microcaps.

## Data Needed

[D-filings](../../03-data-sources/cards/D-filings.md), [D-market](../../03-data-sources/cards/D-market.md)

## Implementation

[OpenSourceAP/CrossSection](https://github.com/OpenSourceAP/CrossSection), signal `PayoutYield`.

## Merged Duplicates

- PayoutYield_q

Grades: A retail with free data and a small account; B retail with paid data, margin or more capital; C edge thin after retail costs or needs low latency; D institutional balance sheet or access; F closed or not feasible.
