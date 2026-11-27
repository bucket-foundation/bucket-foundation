# Sin Stock selection criteria

ID: `eq-cz-sinalgo`
Family: Equities
Retail feasibility: **F**
As of: 2026-11-27
Bead: `bkt-q5moa.15`
Origin: Chen-Zimmermann

## Logic

Signal: Sin Stock (selection criteria). Buy the stocks with the highest values and short the lowest, 20 percent tails, EW weights, rebalanced every 1 months. Using Compustat Segment data, sinAlgo is defined as a binary variable equal to 1 if at least one segment of a firm is listed as being in at least one of the following industries: sic $\geq$ 2100 & sic $\leq$ 2199, sic $\geq$2080 & sic $\leq$ 2085, NAICS in \{7132, 71312, 713210, 71329, 713290, 72112, 721120\}.

## Source

1. The price of sin: The effects of social norms on markets. Hong, Kacperczyk, 2009, Journal of Financial Economics. https://doi.org/10.1016/j.jfineco.2008.09.001 (Crossref search, fetched 2026-11-27)
2. Chen and Zimmermann, Open Source Asset Pricing SignalDoc.csv, release 2026.10. https://huggingface.co/datasets/OpenSourceAP/CrossSection (web fetch, fetched 2026-11-27)

## Claimed Edge

Original paper, sample 1926 to 2006: long-short 0.30 percent a month, t-stat 2.0. Chen-Zimmermann class: predictor, predictability in original paper likely.

## Post-Publication Decay

Chen-Zimmermann replication: in-sample 0.25 percent a month, t 1.5; after publication 0.13 percent, t 0.4, 52 percent of in-sample; 2016 to 2025 0.11 percent, t 0.2.

Decay source: Open Source Cross-Sectional Asset Pricing. Chen, Zimmermann, 2020, SSRN Electronic Journal. https://doi.org/10.2139/ssrn.3604626 (Crossref search, fetched 2026-11-27)

## Capacity

Small: equal-weighted sort tilted to microcaps.

## Data Needed

[D-filings](../../03-data-sources/cards/D-filings.md), [D-market](../../03-data-sources/cards/D-market.md)

## Implementation

[OpenSourceAP/CrossSection](https://github.com/OpenSourceAP/CrossSection), signal `sinAlgo`.

## Merged Duplicates

- sinOrig

Grades: A retail with free data and a small account; B retail with paid data, margin or more capital; C edge thin after retail costs or needs low latency; D institutional balance sheet or access; F closed or not feasible.
