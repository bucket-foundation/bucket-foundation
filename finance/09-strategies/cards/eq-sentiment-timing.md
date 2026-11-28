# Investor Sentiment Timing

ID: `eq-sentiment-timing`
Family: Equities
Retail feasibility: **A**
As of: 2026-11-27
Bead: `bkt-q5moa.5`

## Logic

When the Baker-Wurgler sentiment index is high, expect speculative small young stocks to lag.

## Source

1. Investor Sentiment and the Cross‐Section of Stock Returns. Baker, Wurgler, 2006, The Journal of Finance. https://doi.org/10.1111/j.1540-6261.2006.00885.x (Crossref DOI, fetched 2026-11-27)

## Claimed Edge

Sentiment predicts the cross-section of returns of hard-to-value stocks.

## Post-Publication Decay

Index is public and updated with a lag.

Decay source: Does Academic Research Destroy Stock Return Predictability?. Mclean, Pontiff, 2016, The Journal of Finance. https://doi.org/10.1111/jofi.12365 (Crossref DOI, fetched 2026-11-27)

## Capacity

Medium.

## Data Needed

[D-macro](../../03-data-sources/cards/D-macro.md)

## Implementation

No open-source implementation in `code/`.

## Merged Duplicates

Same logic found in bead `bkt-q5moa.15` sources:

- code lumibot: lumibot/example_strategies/ai_fear_and_greed_trading_bot.py

Grades: A retail with free data and a small account; B retail with paid data, margin or more capital; C edge thin after retail costs or needs low latency; D institutional balance sheet or access; F closed or not feasible.
