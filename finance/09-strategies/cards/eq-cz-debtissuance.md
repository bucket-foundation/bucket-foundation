# Debt Issuance

ID: `eq-cz-debtissuance`
Family: Equities
Retail feasibility: **C**
As of: 2026-11-27
Bead: `bkt-q5moa.15`
Origin: Chen-Zimmermann

## Logic

Signal: Debt Issuance. Buy the stocks with the lowest values and short the highest, 20 percent tails, EW weights, rebalanced every 1 months. Equal to 1 if debt issuance (dltis) greater 0 and 0 otherwise.

## Source

1. The long-run performance of stock returns following debt offerings. Spiess, Affleck-Graves, 1999, Journal of Financial Economics. https://doi.org/10.1016/s0304-405x(99)00031-8 (Crossref search, fetched 2026-11-27)
2. Chen and Zimmermann, Open Source Asset Pricing SignalDoc.csv, release 2026.10. https://huggingface.co/datasets/OpenSourceAP/CrossSection (web fetch, fetched 2026-11-27)

## Claimed Edge

Original paper, sample 1975 to 1989: long-short 0.29 percent a month, t-stat 2.19. Chen-Zimmermann class: predictor, predictability in original paper likely.

## Post-Publication Decay

Chen-Zimmermann replication: in-sample 0.16 percent a month, t 2.8; after publication 0.10 percent, t 0.9, 59 percent of in-sample; 2016 to 2025 -0.09 percent, t -0.5.

Decay source: Open Source Cross-Sectional Asset Pricing. Chen, Zimmermann, 2020, SSRN Electronic Journal. https://doi.org/10.2139/ssrn.3604626 (Crossref search, fetched 2026-11-27)

## Capacity

Small: equal-weighted sort tilted to microcaps.

## Data Needed

[D-filings](../../03-data-sources/cards/D-filings.md), [D-market](../../03-data-sources/cards/D-market.md)

## Implementation

[OpenSourceAP/CrossSection](https://github.com/OpenSourceAP/CrossSection), signal `DebtIssuance`.

Grades: A retail with free data and a small account; B retail with paid data, margin or more capital; C edge thin after retail costs or needs low latency; D institutional balance sheet or access; F closed or not feasible.
