# negative return

ID: `eq-cz-consnegret`
Family: Equities
Retail feasibility: **F**
As of: 2026-11-27
Bead: `bkt-q5moa.15`
Origin: Chen-Zimmermann

## Logic

Signal: negative return. Buy the stocks with the highest values and short the lowest, 20 percent tails, EW weights, rebalanced every 1 months. Define consistent negative returns (ConsNegRet) as 1 if stock returns from months t to t-5 are all less than 0.

## Source

1. Riding the Wave of Sentiment: An Analysis of Return Consistency as a Predictor of Future Returns. Watkins, 2003, Journal of Behavioral Finance. https://doi.org/10.1207/s15427579jpfm0404_2 (Crossref search, fetched 2026-11-27)
2. Chen and Zimmermann, Open Source Asset Pricing SignalDoc.csv, release 2026.10. https://huggingface.co/datasets/OpenSourceAP/CrossSection (web fetch, fetched 2026-11-27)

## Claimed Edge

Original paper, sample 1927 to 1999: 9_drop. Chen-Zimmermann class: drop, predictability in original paper drop.

## Post-Publication Decay

No post-publication series in the Chen-Zimmermann release. Grade C.

Decay source: Open Source Cross-Sectional Asset Pricing. Chen, Zimmermann, 2020, SSRN Electronic Journal. https://doi.org/10.2139/ssrn.3604626 (Crossref search, fetched 2026-11-27)

## Capacity

Small: equal-weighted sort tilted to microcaps.

## Data Needed

[D-market](../../03-data-sources/cards/D-market.md)

## Implementation

[OpenSourceAP/CrossSection](https://github.com/OpenSourceAP/CrossSection), signal `ConsNegRet`.

## Merged Duplicates

- ConsPosRet
- PosNegCons

Grades: A retail with free data and a small account; B retail with paid data, margin or more capital; C edge thin after retail costs or needs low latency; D institutional balance sheet or access; F closed or not feasible.
