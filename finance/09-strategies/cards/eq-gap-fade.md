# Opening Gap Fade

ID: `eq-gap-fade`
Family: Equities
Retail feasibility: **C**
As of: 2026-11-27
Bead: `bkt-q5moa.15`
Origin: Strategies in code

## Logic

Fade overnight price gaps larger than a multiple of recent volatility, expecting the gap to fill intraday.

## Source

1. Source code in `finance/code/`: 2 implementations listed in `08-software/STRATEGIES-IN-CODE.md` (read 2026-11-27).

## Claimed Edge

The code ships it with no claim.

## Post-Publication Decay

No fetched post-publication study. Grade C.

## Capacity

Medium.

## Data Needed

[D-market](../../03-data-sources/cards/D-market.md)

## Implementation

[QuantConnect/Lean](../../08-software/lean.md), [QuantDinger](../../08-software/quantdinger.md)

## Code

- `QuantConnect/Lean: Algorithm.Python/Alphas/PriceGapMeanReversionAlpha.py`
- `QuantDinger: library/strategies/138_quantdinger_gap_filling_strategy.py`

Grades: A retail with free data and a small account; B retail with paid data, margin or more capital; C edge thin after retail costs or needs low latency; D institutional balance sheet or access; F closed or not feasible.
