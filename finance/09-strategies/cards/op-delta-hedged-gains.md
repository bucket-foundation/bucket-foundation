# Delta-Hedged Option Returns

ID: `op-delta-hedged-gains`
Family: Options and Volatility
Retail feasibility: **C**
As of: 2026-11-27
Bead: `bkt-q5moa.5`

## Logic

Sell delta-hedged options to earn the negative volatility risk premium.

## Source

1. Delta-Hedged Gains and the Negative Market Volatility Risk Premium. Kapadia, Bakshi, 2001. https://doi.org/10.2139/ssrn.267106 (Crossref search, fetched 2026-11-27)
2. Kakushadze and Serur, 151 Trading Strategies, section 2.10. https://doi.org/10.1007/978-3-030-02792-6 (Crossref DOI, fetched 2026-11-27)

## Claimed Edge

Delta-hedged index calls lose on average for buyers, consistent with a negative vol premium.

## Post-Publication Decay

Hedging costs consume much of it for single stocks.

Decay source: Delta-Hedged Gains and the Negative Market Volatility Risk Premium. Kapadia, Bakshi, 2001. https://doi.org/10.2139/ssrn.267106 (Crossref search, fetched 2026-11-27)

## Capacity

Medium.

## Data Needed

[D-market](../../03-data-sources/cards/D-market.md)

## Implementation

[financial-models-numerical-methods](../../08-software/financial-models-numerical-methods.md)

## Merged Duplicates

Same logic found in bead `bkt-q5moa.15` sources:

- code gs-quant: gs_quant/backtests/strategy_systematic.py
- code nautechsystems/nautilus_trader: crates/trading/src/examples/strategies/delta_neutral_vol/strategy.rs

Grades: A retail with free data and a small account; B retail with paid data, margin or more capital; C edge thin after retail costs or needs low latency; D institutional balance sheet or access; F closed or not feasible.
