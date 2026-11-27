# Change in call vol

ID: `eq-cz-dvolcall`
Family: Equities
Retail feasibility: **B**
As of: 2026-11-27
Bead: `bkt-q5moa.15`
Origin: Chen-Zimmermann

## Logic

Signal: Change in call vol. Buy the stocks with the highest values and short the lowest, 10 percent tails, EW weights, rebalanced every 1 months. Using OptionM vol surface, 30 day mat, delta = 0.5, find first diff of implied vol

## Source

1. The Joint Cross Section of Stocks and Options. AN and co-authors, 2014, The Journal of Finance. https://doi.org/10.1111/jofi.12181 (Crossref search, fetched 2026-11-27)
2. Chen and Zimmermann, Open Source Asset Pricing SignalDoc.csv, release 2026.10. https://huggingface.co/datasets/OpenSourceAP/CrossSection (web fetch, fetched 2026-11-27)
3. Kakushadze and Serur, 151 Trading Strategies, section 3.5. https://doi.org/10.1007/978-3-030-02792-6 (Crossref DOI, fetched 2026-11-27); Spanish edition arXiv 1912.04492 (arXiv API, fetched 2026-11-27)

## Claimed Edge

Original paper, sample 1996 to 2011: long-short 1.09 percent a month, t-stat 3.45. Chen-Zimmermann class: predictor, predictability in original paper clear.

## Post-Publication Decay

Chen-Zimmermann replication: in-sample 0.89 percent a month, t 2.9; after publication 0.59 percent, t 2.4, 67 percent of in-sample; 2016 to 2025 0.65 percent, t 2.4.

Decay source: Open Source Cross-Sectional Asset Pricing. Chen, Zimmermann, 2020, SSRN Electronic Journal. https://doi.org/10.2139/ssrn.3604626 (Crossref search, fetched 2026-11-27)

## Capacity

Small: equal-weighted sort tilted to microcaps.

## Data Needed

[D-market](../../03-data-sources/cards/D-market.md)

## Implementation

[OpenSourceAP/CrossSection](https://github.com/OpenSourceAP/CrossSection), signal `dVolCall`.

## Merged Duplicates

- KS 3.5

Grades: A retail with free data and a small account; B retail with paid data, margin or more capital; C edge thin after retail costs or needs low latency; D institutional balance sheet or access; F closed or not feasible.
