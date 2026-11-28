# Top-k Dropout Rebalance

ID: `ex-topk-dropout`
Family: Execution and Portfolio Construction
Retail feasibility: **C**
As of: 2026-11-27
Bead: `bkt-q5moa.15`
Origin: Strategies in code

## Logic

Hold the top k names by model score and each period swap out only the n weakest holdings, with a turnover cap.

## Source

1. Source code in `finance/code/`: 2 implementations listed in `08-software/STRATEGIES-IN-CODE.md` (read 2026-11-27).

## Claimed Edge

Qlib benchmarks report excess returns on CSI 300 under this rule, before live costs.

## Post-Publication Decay

No fetched post-publication study. Grade C.

## Capacity

Large.

## Data Needed

[D-market](../../03-data-sources/cards/D-market.md)

## Implementation

[microsoft/qlib](../../08-software/qlib.md)

## Code

- `microsoft/qlib: qlib/contrib/strategy/signal_strategy.py TopkDropoutStrategy`
- `microsoft/qlib: qlib/contrib/strategy/cost_control.py SoftTopkStrategy`

Grades: A retail with free data and a small account; B retail with paid data, margin or more capital; C edge thin after retail costs or needs low latency; D institutional balance sheet or access; F closed or not feasible.
