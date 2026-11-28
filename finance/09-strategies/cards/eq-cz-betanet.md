# Net liquidity beta betanet,p

ID: `eq-cz-betanet`
Family: Equities
Retail feasibility: **F**
As of: 2026-11-27
Bead: `bkt-q5moa.15`
Origin: Chen-Zimmermann

## Logic

Signal: Net liquidity beta (betanet,p). Buy the stocks with the highest values and short the lowest, 20 percent tails, EW weights, rebalanced every 1 months. see monthly Code

## Source

1. Asset Pricing with Liquidity Risk. Acharya, Pedersen, 2004, Crossref. https://doi.org/10.3386/w10814 (Crossref search, fetched 2026-11-27)
2. Chen and Zimmermann, Open Source Asset Pricing SignalDoc.csv, release 2026.10. https://huggingface.co/datasets/OpenSourceAP/CrossSection (web fetch, fetched 2026-11-27)

## Claimed Edge

Original paper, sample 1964 to 1999: in-sample only. Chen-Zimmermann class: placebo, predictability in original paper indirect.

## Post-Publication Decay

Chen-Zimmermann replication: in-sample 0.37 percent a month, t 2.1; after publication 0.11 percent, t 0.5, 30 percent of in-sample; 2016 to 2025 0.20 percent, t 0.5.

Decay source: Open Source Cross-Sectional Asset Pricing. Chen, Zimmermann, 2020, SSRN Electronic Journal. https://doi.org/10.2139/ssrn.3604626 (Crossref search, fetched 2026-11-27)

## Capacity

Medium: liquidity-based signal.

## Data Needed

[D-market](../../03-data-sources/cards/D-market.md)

## Implementation

[OpenSourceAP/CrossSection](https://github.com/OpenSourceAP/CrossSection), signal `betaNet`.

## Merged Duplicates

- betaCC
- betaCR
- betaRC
- betaRR

Grades: A retail with free data and a small account; B retail with paid data, margin or more capital; C edge thin after retail costs or needs low latency; D institutional balance sheet or access; F closed or not feasible.
