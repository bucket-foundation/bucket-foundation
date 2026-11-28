# Buy and Hold

ID: `eq-buy-and-hold`
Family: Equities
Retail feasibility: **A**
As of: 2026-11-27
Bead: `bkt-q5moa.15`
Origin: Strategies in code

## Logic

Buy one index fund or stock and hold it: the benchmark every other card must beat after costs.

## Source

1. Source code in `finance/code/`: 3 implementations listed in `08-software/STRATEGIES-IN-CODE.md` (read 2026-11-27).

## Claimed Edge

Dimson, Marsh and Staunton report a world equity premium near 5 percent a year over bills since 1900.

## Post-Publication Decay

No fetched post-publication study. Grade C.

## Capacity

Large.

## Data Needed

[D-market](../../03-data-sources/cards/D-market.md)

## Implementation

[qstrader](../../08-software/qstrader.md), [rqalpha](../../08-software/rqalpha.md), [stefan-jansen/zipline-reloaded](../../08-software/zipline-reloaded.md)

## Code

- `stefan-jansen/zipline-reloaded: src/zipline/examples/buy_and_hold.py`
- `qstrader: examples/buy_and_hold.py`
- `rqalpha: rqalpha/examples/buy_and_hold.py`

Grades: A retail with free data and a small account; B retail with paid data, margin or more capital; C edge thin after retail costs or needs low latency; D institutional balance sheet or access; F closed or not feasible.
