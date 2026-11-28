# Cross-Exchange Market Making

ID: `cy-xemm`
Family: Crypto
Retail feasibility: **C**
As of: 2026-11-27
Bead: `bkt-q5moa.15`
Origin: Strategies in code

## Logic

Quote on a thin maker venue and hedge every fill at once on a liquid taker venue, keeping the spread gap.

## Source

1. Source code in `finance/code/`: 3 implementations listed in `08-software/STRATEGIES-IN-CODE.md` (read 2026-11-27).

## Claimed Edge

Profit depends on fee tiers and latency; no claim in the code.

## Post-Publication Decay

No fetched post-publication study. Grade C.

## Capacity

Small.

## Data Needed

[D-market](../../03-data-sources/cards/D-market.md)

## Implementation

[hummingbot](../../08-software/hummingbot.md)

## Code

- `hummingbot: hummingbot/strategy/cross_exchange_market_making/`
- `hummingbot: controllers/generic/xemm_multiple_levels.py`
- `hummingbot: scripts/simple_xemm.py`

Grades: A retail with free data and a small account; B retail with paid data, margin or more capital; C edge thin after retail costs or needs low latency; D institutional balance sheet or access; F closed or not feasible.
