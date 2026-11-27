# Almgren-Chriss Optimal Execution

ID: `ex-almgren-chriss`
Family: Execution and Portfolio Construction
Retail feasibility: **B**
As of: 2026-11-27
Bead: `bkt-q5moa.15`
Origin: Strategies in code

## Logic

Schedule child orders on the efficient frontier that trades market impact against price risk for a chosen risk aversion.

## Source

1. Optimal execution of portfolio transactions. Almgren, Chriss, 2001, The Journal of Risk. https://doi.org/10.21314/jor.2001.041 (Crossref search, fetched 2026-11-27)
2. Source code in `finance/code/`: 1 implementations listed in `08-software/STRATEGIES-IN-CODE.md` (read 2026-11-27).

## Claimed Edge

Almgren and Chriss 2001 derived the cost-risk frontier for liquidation schedules.

## Post-Publication Decay

No fetched post-publication study. Grade C.

## Capacity

Large.

## Data Needed

[D-market](../../03-data-sources/cards/D-market.md)

## Implementation

[microsoft/qlib](../../08-software/qlib.md)

## Code

- `microsoft/qlib: qlib/contrib/strategy/rule_strategy.py ACStrategy`

Grades: A retail with free data and a small account; B retail with paid data, margin or more capital; C edge thin after retail costs or needs low latency; D institutional balance sheet or access; F closed or not feasible.
