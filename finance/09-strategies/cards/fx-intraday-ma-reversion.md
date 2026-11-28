# Intraday FX Moving-Average Reversion

ID: `fx-intraday-ma-reversion`
Family: FX
Retail feasibility: **C**
As of: 2026-11-27
Bead: `bkt-q5moa.15`
Origin: Strategies in code

## Logic

On hourly bars between 10am and 3pm, buy when price crosses below its SMA and sell when it crosses above.

## Source

1. Source code in `finance/code/`: 1 implementations listed in `08-software/STRATEGIES-IN-CODE.md` (read 2026-11-27).

## Claimed Edge

QuantConnect ships it with no claim.

## Post-Publication Decay

No fetched post-publication study. Grade C.

## Capacity

Large.

## Data Needed

[D-market](../../03-data-sources/cards/D-market.md)

## Implementation

[QuantConnect/Lean](../../08-software/lean.md)

## Code

- `QuantConnect/Lean: Algorithm.Python/Alphas/IntradayReversalCurrencyMarketsAlpha.py`

Grades: A retail with free data and a small account; B retail with paid data, margin or more capital; C edge thin after retail costs or needs low latency; D institutional balance sheet or access; F closed or not feasible.
