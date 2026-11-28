# Queue Priority Quoting

ID: `ot-queue-priority`
Family: Other
Retail feasibility: **D**
As of: 2026-11-27
Bead: `bkt-q5moa.15`
Origin: Strategies in code

## Logic

On large-tick assets, quote only when the order would sit near the front of the queue and pull otherwise.

## Source

1. Source code in `finance/code/`: 1 implementations listed in `08-software/STRATEGIES-IN-CODE.md` (read 2026-11-27).

## Claimed Edge

hftbacktest shows the effect in replay; needs exchange-grade latency.

## Post-Publication Decay

No fetched post-publication study. Grade C.

## Capacity

Small.

## Data Needed

[D-market](../../03-data-sources/cards/D-market.md)

## Implementation

[hftbacktest](../../08-software/hftbacktest.md)

## Code

- `hftbacktest: examples/Queue-Based Market Making in Large Tick Size Assets.ipynb`

Grades: A retail with free data and a small account; B retail with paid data, margin or more capital; C edge thin after retail costs or needs low latency; D institutional balance sheet or access; F closed or not feasible.
