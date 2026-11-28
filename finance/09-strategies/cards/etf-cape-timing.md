# Valuation Timing, CAPE

ID: `etf-cape-timing`
Family: ETFs and Macro
Retail feasibility: **A**
As of: 2026-11-27
Bead: `bkt-q5moa.5`

## Logic

Reduce equity weight when the cyclically adjusted P/E is high.

## Source

1. Valuation Ratios and the Long-Run Stock Market Outlook. Campbell, Shiller, 1998, The Journal of Portfolio Management. https://doi.org/10.3905/jpm.24.2.11 (Crossref DOI, fetched 2026-11-27)
2. Quantpedia free strategy page. https://quantpedia.com/strategies/fed-model/ (fetched 2026-11-27)

## Claimed Edge

Valuation ratios forecast long-horizon real stock returns.

## Post-Publication Decay

Goyal and Welch find most predictors, including valuation ratios, fail out of sample for short-horizon timing.

Decay source: A Comprehensive Look at The Empirical Performance of Equity Premium Prediction. Welch, Goyal, 2007, Review of Financial Studies. https://doi.org/10.1093/rfs/hhm014 (Crossref DOI, fetched 2026-11-27)

## Capacity

Large.

## Data Needed

[D-longrun](../../03-data-sources/cards/D-longrun.md), [D-macro](../../03-data-sources/cards/D-macro.md)

## Implementation

No open-source implementation in `code/`.

## Merged Duplicates

Same logic found in bead `bkt-q5moa.15` sources:

- code QuantConnect/Lean: Algorithm.Python/BubbleAlgorithm.py

Grades: A retail with free data and a small account; B retail with paid data, margin or more capital; C edge thin after retail costs or needs low latency; D institutional balance sheet or access; F closed or not feasible.
