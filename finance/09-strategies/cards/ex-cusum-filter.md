# CUSUM Event Filter

ID: `ex-cusum-filter`
Family: Execution and Portfolio Construction
Retail feasibility: **C**
As of: 2026-11-27
Bead: `bkt-q5moa.15`
Origin: Strategies in code

## Logic

Sample bars only when the cumulative move since the last event exceeds a threshold, then apply the trading model on those events.

## Source

1. Ten Financial Applications of Machine Learning. Lopez de Prado, 2018, SSRN Electronic Journal. https://doi.org/10.2139/ssrn.3197726 (Crossref search, fetched 2026-11-27)
2. Source code in `finance/code/`: 1 implementations listed in `08-software/STRATEGIES-IN-CODE.md` (read 2026-11-27).

## Claimed Edge

Lopez de Prado 2018 proposes it to cut noise; no return claim.

## Post-Publication Decay

No fetched post-publication study. Grade C.

## Capacity

Large.

## Data Needed

[D-market](../../03-data-sources/cards/D-market.md)

## Implementation

[mlfinlab](../../08-software/mlfinlab.md)

## Code

- `mlfinlab: mlfinlab/filters/filters.py`

Grades: A retail with free data and a small account; B retail with paid data, margin or more capital; C edge thin after retail costs or needs low latency; D institutional balance sheet or access; F closed or not feasible.
