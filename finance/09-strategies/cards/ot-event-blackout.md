# Economic Calendar Blackout

ID: `ot-event-blackout`
Family: Other
Retail feasibility: **A**
As of: 2026-11-27
Bead: `bkt-q5moa.15`
Origin: Strategies in code

## Logic

Delay or skip entries in a window around scheduled high-impact releases to avoid spread and slippage spikes.

## Source

1. Source code in `finance/code/`: 1 implementations listed in `08-software/STRATEGIES-IN-CODE.md` (read 2026-11-27).

## Claimed Edge

A risk filter; no return claim.

## Post-Publication Decay

No fetched post-publication study. Grade C.

## Capacity

Large.

## Data Needed

[D-macro](../../03-data-sources/cards/D-macro.md)

## Implementation

[FinGPT](../../08-software/fingpt.md)

## Code

- `FinGPT: fingpt/FinGPT_ForexIntelligence/timing_model.py`

Grades: A retail with free data and a small account; B retail with paid data, margin or more capital; C edge thin after retail costs or needs low latency; D institutional balance sheet or access; F closed or not feasible.
