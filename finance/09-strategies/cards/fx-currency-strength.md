# Currency Strength Pairing

ID: `fx-currency-strength`
Family: FX
Retail feasibility: **C**
As of: 2026-11-27
Bead: `bkt-q5moa.15`
Origin: Strategies in code

## Logic

Score each currency on macro and sentiment, pair the strongest against the weakest and rank trades by confidence and session.

## Source

1. Source code in `finance/code/`: 1 implementations listed in `08-software/STRATEGIES-IN-CODE.md` (read 2026-11-27).

## Claimed Edge

FinGPT ships it with no performance claim.

## Post-Publication Decay

No fetched post-publication study. Grade C.

## Capacity

Large.

## Data Needed

[D-macro](../../03-data-sources/cards/D-macro.md), [D-market](../../03-data-sources/cards/D-market.md)

## Implementation

[FinGPT](../../08-software/fingpt.md)

## Code

- `FinGPT: fingpt/FinGPT_ForexIntelligence/trade_generator.py`

Grades: A retail with free data and a small account; B retail with paid data, margin or more capital; C edge thin after retail costs or needs low latency; D institutional balance sheet or access; F closed or not feasible.
