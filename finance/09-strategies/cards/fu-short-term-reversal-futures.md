# Futures Short-Term Reversal

ID: `fu-short-term-reversal-futures`
Family: Futures and CTA
Retail feasibility: **C**
As of: 2026-11-27
Bead: `bkt-q5moa.5`

## Logic

Buy futures with the weakest weekly return and high volume change.

## Source

1. Short Term Reversal with Futures - Quantpedia. web. https://quantpedia.com/strategies/short-term-reversal-with-futures/ (web page, fetched 2026-11-27)
2. Quantpedia free strategy page. https://quantpedia.com/strategies/short-term-reversal-with-futures/ (fetched 2026-11-27)

## Claimed Edge

Quantpedia lists reversal profits in futures.

## Post-Publication Decay

Single source; treat as unconfirmed.

Decay source: Does Academic Research Destroy Stock Return Predictability?. Mclean, Pontiff, 2016, The Journal of Finance. https://doi.org/10.1111/jofi.12365 (Crossref DOI, fetched 2026-11-27)

## Capacity

Medium.

## Data Needed

[D-market](../../03-data-sources/cards/D-market.md)

## Implementation

[pysystemtrade](../../08-software/pysystemtrade.md)

## Merged Duplicates

Same logic found in bead `bkt-q5moa.15` sources:

- KS 10.3
- Quantpedia short-term-reversal-with-futures
- code pysystemtrade: systems/provided/rules/cs_mr.py
- code pysystemtrade: systems/provided/rules/mr_wings.py

Grades: A retail with free data and a small account; B retail with paid data, margin or more capital; C edge thin after retail costs or needs low latency; D institutional balance sheet or access; F closed or not feasible.
