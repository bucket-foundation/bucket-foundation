# M2 Liquidity Allocation

ID: `etf-m2-liquidity`
Family: ETFs and Macro
Retail feasibility: **C**
As of: 2026-11-27
Bead: `bkt-q5moa.15`
Origin: Strategies in code

## Logic

Raise equity and crypto risk when M2 money supply growth accelerates, cut it when M2 growth falls.

## Source

1. Source code in `finance/code/`: 1 implementations listed in `08-software/STRATEGIES-IN-CODE.md` (read 2026-11-27).

## Claimed Edge

Lumibot ships it with no claim.

## Post-Publication Decay

No fetched post-publication study. Grade C.

## Capacity

Large.

## Data Needed

[D-macro](../../03-data-sources/cards/D-macro.md)

## Implementation

[lumibot](../../08-software/lumibot.md)

## Code

- `lumibot: lumibot/example_strategies/agent_m2_liquidity.py`

Grades: A retail with free data and a small account; B retail with paid data, margin or more capital; C edge thin after retail costs or needs low latency; D institutional balance sheet or access; F closed or not feasible.
