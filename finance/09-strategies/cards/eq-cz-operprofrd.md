# Operating profitability R&D adjusted

ID: `eq-cz-operprofrd`
Family: Equities
Retail feasibility: **C**
As of: 2026-11-27
Bead: `bkt-q5moa.15`
Origin: Chen-Zimmermann

## Logic

Signal: Operating profitability R&D adjusted. Buy the stocks with the highest values and short the lowest, 10 percent tails, VW weights, rebalanced every 12 months. Revenue (revt) minus cost (cogs) - (administrative expenses (xsga) - R&D expenses (xrd)), all divided by total assets (at) in year t.

## Source

1. Accruals, cash flows, and operating profitability in the cross section of stock returns. Ball and co-authors, 2016, Journal of Financial Economics. https://doi.org/10.1016/j.jfineco.2016.03.002 (Crossref search, fetched 2026-11-27)
2. Chen and Zimmermann, Open Source Asset Pricing SignalDoc.csv, release 2026.10. https://huggingface.co/datasets/OpenSourceAP/CrossSection (web fetch, fetched 2026-11-27)

## Claimed Edge

Original paper, sample 1963 to 2014: long-short 0.29 percent a month, t-stat 1.84. Chen-Zimmermann class: predictor, predictability in original paper likely.

## Post-Publication Decay

Chen-Zimmermann replication: in-sample 0.34 percent a month, t 1.9; after publication 0.73 percent, t 1.4, 216 percent of in-sample; 2016 to 2025 0.70 percent, t 1.4.

Decay source: Open Source Cross-Sectional Asset Pricing. Chen, Zimmermann, 2020, SSRN Electronic Journal. https://doi.org/10.2139/ssrn.3604626 (Crossref search, fetched 2026-11-27)

## Capacity

Large: value-weighted sort.

## Data Needed

[D-filings](../../03-data-sources/cards/D-filings.md), [D-market](../../03-data-sources/cards/D-market.md)

## Implementation

[OpenSourceAP/CrossSection](https://github.com/OpenSourceAP/CrossSection), signal `OperProfRD`.

## Merged Duplicates

- OperProfRDLagAT
- OperProfRDLagAT_q

Grades: A retail with free data and a small account; B retail with paid data, margin or more capital; C edge thin after retail costs or needs low latency; D institutional balance sheet or access; F closed or not feasible.
