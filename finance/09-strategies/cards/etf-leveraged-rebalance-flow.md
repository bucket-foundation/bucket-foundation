# Leveraged ETF Rebalance Flow

ID: `etf-leveraged-rebalance-flow`
Family: ETFs and Macro
Retail feasibility: **C**
As of: 2026-11-27
Bead: `bkt-q5moa.5`

## Logic

Leveraged and inverse ETFs must buy into up days and sell into down days near the close. Trade the predictable flow.

## Source

1. Intraday Share Price Volatility and Leveraged ETF Rebalancing. Rodier, Haryanto, Shum, Hejazi, 2012, SSRN Electronic Journal. https://doi.org/10.2139/ssrn.2161057 (Crossref search, fetched 2026-11-27)

## Claimed Edge

End-of-day rebalancing demand moves prices in the direction of the day's return.

## Post-Publication Decay

Ivanov and Lenkey test how much leveraged ETF rebalancing moves late-day prices; the flow is public and market makers absorb it.

Decay source: Do leveraged ETFs really amplify late-day returns and volatility?. Ivanov, Lenkey, 2018, Journal of Financial Markets. https://doi.org/10.1016/j.finmar.2018.09.001 (Crossref search, fetched 2026-11-27) <!-- voice-ignore-line -->

## Capacity

Small.

## Data Needed

[D-market](../../03-data-sources/cards/D-market.md)

## Implementation

No open-source implementation in `code/`.

## Merged Duplicates

Same logic found in bead `bkt-q5moa.15` sources:

- code QuantConnect/Lean: Algorithm.Python/Alphas/RebalancingLeveragedETFAlpha.py

Grades: A retail with free data and a small account; B retail with paid data, margin or more capital; C edge thin after retail costs or needs low latency; D institutional balance sheet or access; F closed or not feasible.
