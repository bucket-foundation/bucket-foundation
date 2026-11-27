# Reinforcement Learning for Systematic FX Trading

ID: `fx-ax-reinforcement-learning-for-systematic-fx-trading`
Family: FX
Retail feasibility: **C**
As of: 2026-11-27
Bead: `bkt-q5moa.15`
Origin: arXiv q-fin.TR or q-fin.PM 2015 to 2026

## Logic

From the abstract: Our agent achieves an annualised portfolio information ratio of 0.52 with a compound return of 9.3\%, net of execution and funding cost, over a 7-year test set; this is despite forcing the model to trade at the close of the trading day at 5 pm EST when trading costs are statistically the most expensive.

## Source

1. Reinforcement Learning for Systematic FX Trading. Gabriel Borrageiro and co-authors, 2021, arXiv 2110.04745. https://arxiv.org/abs/2110.04745 (arXiv API, fetched 2026-11-27)
2. Published version: https://doi.org/10.1109/ACCESS.2021.3139510 (DOI listed by the arXiv API, fetched 2026-11-27)

## Claimed Edge

The abstract reports: These sources of profit and loss, including the price trends that occur in the currency markets, are made available to the agent via a quadratic utility, who learns to target a position directly.

## Post-Publication Decay

Single arXiv study with no out-of-sample follow-up fetched. Grade C.

## Capacity

Unknown; the abstract gives no capacity figure. Treat as Small until tested.

## Data Needed

[D-market](../../03-data-sources/cards/D-market.md)

## Implementation

No open-source implementation in `code/`.

Grades: A retail with free data and a small account; B retail with paid data, margin or more capital; C edge thin after retail costs or needs low latency; D institutional balance sheet or access; F closed or not feasible.
