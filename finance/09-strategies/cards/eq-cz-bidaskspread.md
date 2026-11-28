# Bid-ask spread

ID: `eq-cz-bidaskspread`
Family: Equities
Retail feasibility: **F**
As of: 2026-11-27
Bead: `bkt-q5moa.15`
Origin: Chen-Zimmermann

## Logic

Signal: Bid-ask spread. Buy the stocks with the highest values and short the lowest, 14 percent tails, EW weights, rebalanced every 1 months. Effective bid ask spread based on Corwin-Schulz scaled by stock price.

## Source

1. Asset pricing and the bid-ask spread. Amihud, Mendelson, 1986, Journal of Financial Economics. https://doi.org/10.1016/0304-405x(86)90065-6 (Crossref search, fetched 2026-11-27)
2. Chen and Zimmermann, Open Source Asset Pricing SignalDoc.csv, release 2026.10. https://huggingface.co/datasets/OpenSourceAP/CrossSection (web fetch, fetched 2026-11-27)

## Claimed Edge

Original paper, sample 1961 to 1980: strong port sorts but no LS special data. Chen-Zimmermann class: predictor, predictability in original paper likely.

## Post-Publication Decay

Chen-Zimmermann replication: in-sample 0.74 percent a month, t 1.7; after publication 0.02 percent, t 0.1, 3 percent of in-sample; 2016 to 2025 -0.63 percent, t -0.8.

Decay source: Open Source Cross-Sectional Asset Pricing. Chen, Zimmermann, 2020, SSRN Electronic Journal. https://doi.org/10.2139/ssrn.3604626 (Crossref search, fetched 2026-11-27)

## Capacity

Small: equal-weighted sort tilted to microcaps.

## Data Needed

[D-market](../../03-data-sources/cards/D-market.md)

## Implementation

[OpenSourceAP/CrossSection](https://github.com/OpenSourceAP/CrossSection), signal `BidAskSpread`.

## Merged Duplicates

- BidAskTAQ

Grades: A retail with free data and a small account; B retail with paid data, margin or more capital; C edge thin after retail costs or needs low latency; D institutional balance sheet or access; F closed or not feasible.
