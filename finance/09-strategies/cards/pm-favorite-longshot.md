# Favorite-Longshot Bias in Prediction Markets

ID: `pm-favorite-longshot`
Family: Prediction Markets
Retail feasibility: **A**
As of: 2026-11-27
Bead: `bkt-q5moa.5`

## Logic

Sell longshots priced under 10 cents, buy heavy favorites.

## Source

1. Prediction Markets. Wolfers, Zitzewitz, 2004, Journal of Economic Perspectives. https://doi.org/10.1257/0895330041371321 (Crossref DOI, fetched 2026-11-27)

## Claimed Edge

Wolfers and Zitzewitz report longshots are overpriced in prediction markets as at racetracks.

## Post-Publication Decay

Burgi and co-authors find the bias in Kalshi data; capital tied up until resolution lowers annualized return.

Decay source: Makers and Takers: The Economics of the Kalshi Prediction Market. Bürgi, Deng, Whelan, 2025. https://doi.org/10.2139/ssrn.5502658 (Crossref search, fetched 2026-11-27)

## Capacity

Small.

## Data Needed

[D-onchain](../../03-data-sources/cards/D-onchain.md), [D-market](../../03-data-sources/cards/D-market.md)

## Implementation

[prediction-market-analysis](../../08-software/prediction-market-analysis.md), [prediction-market-backtesting](../../08-software/prediction-market-backtesting.md)

## Merged Duplicates

Same logic found in bead `bkt-q5moa.15` sources:

- code lumibot: lumibot/example_strategies/kalshi_favorite_backtest.py
- code prediction-market-backtesting: strategies/deep_value.py

Grades: A retail with free data and a small account; B retail with paid data, margin or more capital; C edge thin after retail costs or needs low latency; D institutional balance sheet or access; F closed or not feasible.
