# 52-Week High Momentum

ID: `eq-52-week-high`
Family: Equities
Retail feasibility: **A**
As of: 2026-11-27
Bead: `bkt-q5moa.5`

## Logic

Buy stocks closest to their 52-week high, short those furthest away.

## Source

1. The 52‐Week High and Momentum Investing. George, Hwang, 2004, The Journal of Finance. https://doi.org/10.1111/j.1540-6261.2004.00695.x (Crossref DOI, fetched 2026-11-27)
2. Quantpedia free strategy page. https://quantpedia.com/strategies/52-weeks-high-effect-in-stocks/ (fetched 2026-11-27)

## Claimed Edge

Nearness to the 52-week high dominates past return as a momentum predictor and shows less long-run reversal.

## Post-Publication Decay

Subject to the 58% average post-publication decline McLean-Pontiff measure.

Decay source: Does Academic Research Destroy Stock Return Predictability?. Mclean, Pontiff, 2016, The Journal of Finance. https://doi.org/10.1111/jofi.12365 (Crossref DOI, fetched 2026-11-27)

## Capacity

Medium.

## Data Needed

[D-market](../../03-data-sources/cards/D-market.md)

## Implementation

[vectorbt](../../08-software/vectorbt.md)

## Merged Duplicates

Same logic found in bead `bkt-q5moa.15` sources:

- High52
- Quantpedia 52-weeks-high-effect-in-stocks

Grades: A retail with free data and a small account; B retail with paid data, margin or more capital; C edge thin after retail costs or needs low latency; D institutional balance sheet or access; F closed or not feasible.
