# Long-term EPS forecast

ID: `eq-cz-fgr5yrlag`
Family: Equities
Retail feasibility: **F**
As of: 2026-11-27
Bead: `bkt-q5moa.15`
Origin: Chen-Zimmermann

## Logic

Signal: Long-term EPS forecast. Buy the stocks with the lowest values and short the highest, 20 percent tails, EW weights, rebalanced every 3 months. Lag long-term earnings forecast (fgr5yr) by 6 months.

## Source

1. Expectations and the Cross‐Section of Stock Returns. LA PORTA, 1996, The Journal of Finance. https://doi.org/10.1111/j.1540-6261.1996.tb05223.x (Crossref search, fetched 2026-11-27)
2. Chen and Zimmermann, Open Source Asset Pricing SignalDoc.csv, release 2026.10. https://huggingface.co/datasets/OpenSourceAP/CrossSection (web fetch, fetched 2026-11-27)

## Claimed Edge

Original paper, sample 1983 to 1990: t=4.9 in regression. Chen-Zimmermann class: predictor, predictability in original paper clear.

## Post-Publication Decay

Chen-Zimmermann replication: in-sample 0.84 percent a month, t 2.1; after publication -0.01 percent, t -0.0, -1 percent of in-sample; 2016 to 2025 -0.17 percent, t -0.6.

Decay source: Open Source Cross-Sectional Asset Pricing. Chen, Zimmermann, 2020, SSRN Electronic Journal. https://doi.org/10.2139/ssrn.3604626 (Crossref search, fetched 2026-11-27)

## Capacity

Small: equal-weighted sort tilted to microcaps.

## Data Needed

[D-filings](../../03-data-sources/cards/D-filings.md), [D-market](../../03-data-sources/cards/D-market.md)

## Implementation

[OpenSourceAP/CrossSection](https://github.com/OpenSourceAP/CrossSection), signal `fgr5yrLag`.

## Merged Duplicates

- fgr5yrNoLag

Grades: A retail with free data and a small account; B retail with paid data, margin or more capital; C edge thin after retail costs or needs low latency; D institutional balance sheet or access; F closed or not feasible.
