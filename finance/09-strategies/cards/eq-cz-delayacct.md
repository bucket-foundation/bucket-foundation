# Accounting component of price delay

ID: `eq-cz-delayacct`
Family: Equities
Retail feasibility: **F**
As of: 2026-11-27
Bead: `bkt-q5moa.15`
Origin: Chen-Zimmermann

## Logic

Signal: Accounting component of price delay. Buy the stocks with the highest values and short the lowest, 20 percent tails, EW weights, rebalanced every 12 months. Monthly cross-sectional regression of PriceDelay on AccrualQuality, special items (si) scaled by average total assets (at) and earnings surprise (meanest - actual) scaled by its cross-sectional standard deviation.

## Source

1. Accounting Quality, Stock Price Delay and Future Stock Returns. Callen and co-authors, 2010, Crossref. https://doi.org/10.2139/ssrn.1530322 (Crossref search, fetched 2026-11-27)
2. Chen and Zimmermann, Open Source Asset Pricing SignalDoc.csv, release 2026.10. https://huggingface.co/datasets/OpenSourceAP/CrossSection (web fetch, fetched 2026-11-27)

## Claimed Edge

Original paper, sample 1981 to 2006: long-short 0.28 percent a month, t-stat 1.08. Chen-Zimmermann class: placebo, predictability in original paper not.

## Post-Publication Decay

Chen-Zimmermann replication: in-sample -0.19 percent a month, t -1.0; after publication -0.31 percent, t -1.1, 162 percent of in-sample; 2016 to 2025 -0.25 percent, t -0.8.

Decay source: Open Source Cross-Sectional Asset Pricing. Chen, Zimmermann, 2020, SSRN Electronic Journal. https://doi.org/10.2139/ssrn.3604626 (Crossref search, fetched 2026-11-27)

## Capacity

Small: equal-weighted sort tilted to microcaps.

## Data Needed

[D-filings](../../03-data-sources/cards/D-filings.md), [D-market](../../03-data-sources/cards/D-market.md)

## Implementation

[OpenSourceAP/CrossSection](https://github.com/OpenSourceAP/CrossSection), signal `DelayAcct`.

## Merged Duplicates

- DelayNonAcct

Grades: A retail with free data and a small account; B retail with paid data, margin or more capital; C edge thin after retail costs or needs low latency; D institutional balance sheet or access; F closed or not feasible.
