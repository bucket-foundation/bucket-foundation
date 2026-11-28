# Deep Hedging

ID: `ot-deep-hedging`
Family: Other
Retail feasibility: **D**
As of: 2026-11-27
Bead: `bkt-q5moa.15`
Origin: Strategies in code

## Logic

Train a neural network to choose hedge ratios for an option book that minimize a risk measure under transaction costs.

## Source

1. Lecture Notes Learning to Trade III: Deep Hedging with Impact, Deep Bellman Hedging, Open Research Questions. Buehler, Horvath, 2022, SSRN Electronic Journal. https://doi.org/10.2139/ssrn.4151043 (Crossref search, fetched 2026-11-27)
2. Source code in `finance/code/`: 1 implementations listed in `08-software/STRATEGIES-IN-CODE.md` (read 2026-11-27).

## Claimed Edge

Buehler, Gonon, Teichmann and Wood 2019 showed the method learns near-optimal hedges under costs in simulation.

## Post-Publication Decay

No fetched post-publication study. Grade C.

## Capacity

Large.

## Data Needed

[D-market](../../03-data-sources/cards/D-market.md)

## Implementation

[stefan-jansen/machine-learning-for-trading](../../08-software/machine-learning-for-trading.md)

## Code

- `stefan-jansen/machine-learning-for-trading: 21_rl_execution_hedging/05_deep_hedging_pfhedge.py`

Grades: A retail with free data and a small account; B retail with paid data, margin or more capital; C edge thin after retail costs or needs low latency; D institutional balance sheet or access; F closed or not feasible.
