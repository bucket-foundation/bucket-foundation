# Mega-Cap Concentration

ID: `eq-largest-caps`
Family: Equities
Retail feasibility: **A**
As of: 2026-11-27
Bead: `bkt-q5moa.15`
Origin: Strategies in code

## Logic

Hold the few largest stocks by market cap or dollar volume and rebalance monthly.

## Source

1. Source code in `finance/code/`: 2 implementations listed in `08-software/STRATEGIES-IN-CODE.md` (read 2026-11-27).

## Claimed Edge

No claim in the code; a concentrated large-cap tilt.

## Post-Publication Decay

No fetched post-publication study. Grade C.

## Capacity

Large.

## Data Needed

[D-market](../../03-data-sources/cards/D-market.md)

## Implementation

[QuantConnect/Lean](../../08-software/lean.md), [lumibot](../../08-software/lumibot.md)

## Code

- `QuantConnect/Lean: Algorithm.Python/CoarseFundamentalTop3Algorithm.py`
- `lumibot: lumibot/example_strategies/stock_top_market_cap.py`

Grades: A retail with free data and a small account; B retail with paid data, margin or more capital; C edge thin after retail costs or needs low latency; D institutional balance sheet or access; F closed or not feasible.
