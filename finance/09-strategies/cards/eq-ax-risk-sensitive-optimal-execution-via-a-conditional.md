# Risk-Sensitive Optimal Execution via a Conditional Value-at-Risk Objective

ID: `eq-ax-risk-sensitive-optimal-execution-via-a-conditional`
Family: Equities
Retail feasibility: **C**
As of: 2026-11-27
Bead: `bkt-q5moa.15`
Origin: arXiv q-fin.TR or q-fin.PM 2015 to 2026

## Logic

From the abstract: Our formulation begins with a continuous-time and infinite horizon variation of the seminal model of Almgren and Chriss (2000), but we define as the objective the conditional value-at-risk (CVaR) of the implementation shortfall, and allow for dynamic (adaptive) trading strategies. The trader encounters a trade-off between the transaction costs incurred due to market impact and the volatility risk of holding the position.

## Source

1. Risk-Sensitive Optimal Execution via a Conditional Value-at-Risk Objective. Seungki Min and co-authors, 2022, arXiv 2201.11962. https://arxiv.org/abs/2201.11962 (arXiv API, fetched 2026-11-27)

## Claimed Edge

The abstract reports: The relevant improvement depends only on the level of risk aversion: for moderate levels of risk aversion, the optimal dynamic policy outperforms the optimal static policy by 5-15%, and outperforms the optimal volume weighted average price (VWAP) policy by 15-25%.

## Post-Publication Decay

Single arXiv study with no out-of-sample follow-up fetched. Grade C.

## Capacity

Unknown; the abstract gives no capacity figure. Treat as Small until tested.

## Data Needed

[D-market](../../03-data-sources/cards/D-market.md)

## Implementation

No open-source implementation in `code/`.

Grades: A retail with free data and a small account; B retail with paid data, margin or more capital; C edge thin after retail costs or needs low latency; D institutional balance sheet or access; F closed or not feasible.
