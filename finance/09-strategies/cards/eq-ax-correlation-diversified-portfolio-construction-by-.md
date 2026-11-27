# Correlation-diversified portfolio construction by finding maximum independent set in large-scale market graph

ID: `eq-ax-correlation-diversified-portfolio-construction-by-`
Family: Equities
Retail feasibility: **C**
As of: 2026-11-27
Bead: `bkt-q5moa.15`
Origin: arXiv q-fin.TR or q-fin.PM 2015 to 2026

## Logic

From the abstract: Here we construct a diversified portfolio by solving the MIS problem for a large-scale market graph with a combinatorial optimization solver (an Ising machine) based on a quantum-inspired algorithm called simulated bifurcation (SB) and investigate the investment performance of the constructed portfolio using long-term historical market data. By using the SB-based solver, we optimized the parameters of a MIS portfolio strategy through iteration of the backcast simulation that calculates the performance of the MIS portfolio strategy based on a large-scale universe covering more than 1,700 Japanese stocks for a long period of 10 years.

## Source

1. Correlation-diversified portfolio construction by finding maximum independent set in large-scale market graph. Ryo Hidaka and co-authors, 2023, arXiv 2308.04769. https://arxiv.org/abs/2308.04769 (arXiv API, fetched 2026-11-27)
2. Published version: https://doi.org/10.1109/ACCESS.2023.3341422 (DOI listed by the arXiv API, fetched 2026-11-27)

## Claimed Edge

The abstract reports: Comparisons using stock universes of various sizes [TOPIX 100, Nikkei 225, TOPIX 1000, and TOPIX (including approximately 2,000 constituents)] show that the SB-based solver outperforms conventional MIS solvers in terms of computation-time and solution-accuracy. It has been found that the best MIS portfolio strategy (Sharpe ratio = 1.16, annualized return/risk = 16.3%/14.0%) outperforms the major indices such as TOPIX (0.66, 10.0%/15.2%) and MSCI Japan Minimum Volatility Index (0.64, 7.7%/12.1%) for the period from 2013 to 2023.

## Post-Publication Decay

Single arXiv study with no out-of-sample follow-up fetched. Grade C.

## Capacity

Unknown; the abstract gives no capacity figure. Treat as Small until tested.

## Data Needed

[D-market](../../03-data-sources/cards/D-market.md)

## Implementation

No open-source implementation in `code/`.

Grades: A retail with free data and a small account; B retail with paid data, margin or more capital; C edge thin after retail costs or needs low latency; D institutional balance sheet or access; F closed or not feasible.
