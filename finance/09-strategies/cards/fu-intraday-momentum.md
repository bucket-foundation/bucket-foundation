# Intraday Momentum

ID: `fu-intraday-momentum`
Family: Futures and CTA
Retail feasibility: **B**
As of: 2026-11-27
Bead: `bkt-q5moa.5`

## Logic

First half-hour SPY return predicts the last half-hour return.

## Source

1. Market intraday momentum. Gao, Han, Zhengzi Li, Zhou, 2018, Journal of Financial Economics. https://doi.org/10.1016/j.jfineco.2018.05.009 (Crossref DOI, fetched 2026-11-27)

## Claimed Edge

Gao and co-authors find significant predictability 1993-2013.

## Post-Publication Decay

Decay source: Does Academic Research Destroy Stock Return Predictability?. Mclean, Pontiff, 2016, The Journal of Finance. https://doi.org/10.1111/jofi.12365 (Crossref DOI, fetched 2026-11-27)

## Capacity

Medium.

## Data Needed

[D-market](../../03-data-sources/cards/D-market.md)

## Implementation

[hftbacktest](../../08-software/hftbacktest.md), [backtrader](../../08-software/backtrader.md)

Grades: A retail with free data and a small account; B retail with paid data, margin or more capital; C edge thin after retail costs or needs low latency; D institutional balance sheet or access; F closed or not feasible.
