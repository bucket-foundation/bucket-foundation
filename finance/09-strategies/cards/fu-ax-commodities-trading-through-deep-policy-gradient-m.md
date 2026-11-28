# Commodities Trading through Deep Policy Gradient Methods

ID: `fu-ax-commodities-trading-through-deep-policy-gradient-m`
Family: Futures and CTA
Retail feasibility: **C**
As of: 2026-11-27
Bead: `bkt-q5moa.15`
Origin: arXiv q-fin.TR or q-fin.PM 2015 to 2026

## Logic

From the abstract: These agents utilize CNNs and LSTMs as parametric function approximators to map historical price observations to market positions.Backtesting on front-month natural gas futures demonstrates that DRL models increase the Sharpe ratio by $83\%$ compared to the buy-and-hold baseline.

## Source

1. Commodities Trading through Deep Policy Gradient Methods. Jonas Hanetho, 2023, arXiv 2309.00630. https://arxiv.org/abs/2309.00630 (arXiv API, fetched 2026-11-27)

## Claimed Edge

The abstract reports: The actor-based models outperform the actor-critic-based models, while the CNN-based models show a slight performance advantage over the LSTM-based models.

## Post-Publication Decay

Single arXiv study with no out-of-sample follow-up fetched. Grade C.

## Capacity

Unknown; the abstract gives no capacity figure. Treat as Small until tested.

## Data Needed

[D-market](../../03-data-sources/cards/D-market.md)

## Implementation

No open-source implementation in `code/`.

Grades: A retail with free data and a small account; B retail with paid data, margin or more capital; C edge thin after retail costs or needs low latency; D institutional balance sheet or access; F closed or not feasible.
