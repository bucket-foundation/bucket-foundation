# Balancing Profit

ID: `eq-ax-balancing-profit`
Family: Equities
Retail feasibility: **C**
As of: 2026-11-27
Bead: `bkt-q5moa.15`
Origin: arXiv q-fin.TR or q-fin.PM 2015 to 2026

## Logic

From the abstract:, by incorporating risk and sustainability criteria in the utility function, we improve on the state-of-the-art in reinforcement learning for portfolio optimization; risk and sustainability are essential in any modern trading strategy and we propose a system that does not only report these metrics, but that actively optimizes the portfolio to improve on them.

## Source

1. Balancing Profit, Risk, and Sustainability for Portfolio Management. Charl Maree and co-authors, 2022, arXiv 2207.02134. https://arxiv.org/abs/2207.02134 (arXiv API, fetched 2026-11-27)
2. Published version: https://doi.org/10.1109/CIFEr52523.2022.9776048 (DOI listed by the arXiv API, fetched 2026-11-27)

## Claimed Edge

The abstract reports: This is a well-suited problem for reinforcement learning, as daily rewards are compounding and objective functions may include more than just profit, e.g., risk and sustainability. We developed a new utility function with the Sharpe ratio representing risk and the environmental, social, and governance score (ESG) representing sustainability.

## Post-Publication Decay

Single arXiv study with no out-of-sample follow-up fetched. Grade C.

## Capacity

Unknown; the abstract gives no capacity figure. Treat as Small until tested.

## Data Needed

[D-market](../../03-data-sources/cards/D-market.md)

## Implementation

No open-source implementation in `code/`.

Grades: A retail with free data and a small account; B retail with paid data, margin or more capital; C edge thin after retail costs or needs low latency; D institutional balance sheet or access; F closed or not feasible.
