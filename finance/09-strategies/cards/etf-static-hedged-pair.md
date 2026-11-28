# Static Long-Short ETF Pair

ID: `etf-static-hedged-pair`
Family: ETFs and Macro
Retail feasibility: **B**
As of: 2026-11-27
Bead: `bkt-q5moa.15`
Origin: Strategies in code

## Logic

Hold a fixed dollar long in one ETF and short in another, a hedged spread with no timing signal.

## Source

1. Source code in `finance/code/`: 1 implementations listed in `08-software/STRATEGIES-IN-CODE.md` (read 2026-11-27).

## Claimed Edge

Return equals the spread performance of the two ETFs.

## Post-Publication Decay

No fetched post-publication study. Grade C.

## Capacity

Large.

## Data Needed

[D-market](../../03-data-sources/cards/D-market.md)

## Implementation

[qstrader](../../08-software/qstrader.md)

## Code

- `qstrader: examples/long_short.py`

Grades: A retail with free data and a small account; B retail with paid data, margin or more capital; C edge thin after retail costs or needs low latency; D institutional balance sheet or access; F closed or not feasible.
