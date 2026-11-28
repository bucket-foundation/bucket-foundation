# VWAP and POV Execution

ID: `ex-vwap-pov`
Family: Execution and Portfolio Construction
Retail feasibility: **B**
As of: 2026-11-27
Bead: `bkt-q5moa.15`
Origin: Strategies in code

## Logic

Slice a parent order in proportion to expected volume, or as a fixed share of live volume, and buy only below VWAP.

## Source

1. Source code in `finance/code/`: 2 implementations listed in `08-software/STRATEGIES-IN-CODE.md` (read 2026-11-27).

## Claimed Edge

Execution benchmark; aims to match VWAP.

## Post-Publication Decay

No fetched post-publication study. Grade C.

## Capacity

Large.

## Data Needed

[D-market](../../03-data-sources/cards/D-market.md)

## Implementation

[QuantConnect/Lean](../../08-software/lean.md), [hummingbot](../../08-software/hummingbot.md)

## Code

- `hummingbot: scripts/simple_vwap.py`
- `QuantConnect/Lean: Algorithm.Framework/Execution/VolumeWeightedAveragePriceExecutionModel.py`

Grades: A retail with free data and a small account; B retail with paid data, margin or more capital; C edge thin after retail costs or needs low latency; D institutional balance sheet or access; F closed or not feasible.
