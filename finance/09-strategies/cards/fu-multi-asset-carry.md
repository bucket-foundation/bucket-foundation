# Multi-Asset Carry

ID: `fu-multi-asset-carry`
Family: Futures and CTA
Retail feasibility: **B**
As of: 2026-11-27
Bead: `bkt-q5moa.5`

## Logic

Rank futures in every asset class on carry and hold the high-carry ones.

## Source

1. Carry. Koijen, Moskowitz, Pedersen, Vrugt, 2018, Journal of Financial Economics. https://doi.org/10.1016/j.jfineco.2017.11.002 (Crossref DOI, fetched 2026-11-27)

## Claimed Edge

A diversified carry portfolio across asset classes beats single-class carry.

## Post-Publication Decay

Carry crashes in liquidity crises.

Decay source: Carry Trades and Currency Crashes. Brunnermeier, Nagel, Pedersen, 2008, NBER Macroeconomics Annual. https://doi.org/10.1086/593088 (Crossref DOI, fetched 2026-11-27)

## Capacity

Large.

## Data Needed

[D-market](../../03-data-sources/cards/D-market.md), [D-macro](../../03-data-sources/cards/D-macro.md)

## Implementation

[pysystemtrade](../../08-software/pysystemtrade.md)

## Merged Duplicates

Same logic found in bead `bkt-q5moa.15` sources:

- code pysystemtrade: systems/provided/rules/carry.py

Grades: A retail with free data and a small account; B retail with paid data, margin or more capital; C edge thin after retail costs or needs low latency; D institutional balance sheet or access; F closed or not feasible.
