# Total accruals

ID: `eq-cz-totalaccruals`
Family: Equities
Retail feasibility: **F**
As of: 2026-11-27
Bead: `bkt-q5moa.15`
Origin: Chen-Zimmermann

## Logic

Signal: Total accruals. Buy the stocks with the lowest values and short the highest, 20 percent tails, EW weights, rebalanced every 12 months. Before 1988: Change in net working capital ((act - che) - (lct - dlc)) plus change in net noncurrent assets ( (at - act - ivao) - (lt - dlc - dltt)) plus change in net financial assets ( (ivst + ivao - (dltt + dlc + pstk)).

## Source

1. Accrual reliability, earnings persistence and stock prices. Richardson and co-authors, 2005, Journal of Accounting and Economics. https://doi.org/10.1016/j.jacceco.2005.04.005 (Crossref search, fetched 2026-11-27)
2. Chen and Zimmermann, Open Source Asset Pricing SignalDoc.csv, release 2026.10. https://huggingface.co/datasets/OpenSourceAP/CrossSection (web fetch, fetched 2026-11-27)

## Claimed Edge

Original paper, sample 1962 to 2001: t=6 in mv reg. Chen-Zimmermann class: predictor, predictability in original paper clear.

## Post-Publication Decay

Chen-Zimmermann replication: in-sample 0.30 percent a month, t 2.8; after publication -0.04 percent, t -0.3, -14 percent of in-sample; 2016 to 2025 -0.11 percent, t -0.4.

Decay source: Open Source Cross-Sectional Asset Pricing. Chen, Zimmermann, 2020, SSRN Electronic Journal. https://doi.org/10.2139/ssrn.3604626 (Crossref search, fetched 2026-11-27)

## Capacity

Small: equal-weighted sort tilted to microcaps.

## Data Needed

[D-filings](../../03-data-sources/cards/D-filings.md), [D-market](../../03-data-sources/cards/D-market.md)

## Implementation

[OpenSourceAP/CrossSection](https://github.com/OpenSourceAP/CrossSection), signal `TotalAccruals`.

Grades: A retail with free data and a small account; B retail with paid data, margin or more capital; C edge thin after retail costs or needs low latency; D institutional balance sheet or access; F closed or not feasible.
