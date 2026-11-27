# Hierarchical Risk Parity for Portfolio Allocation in the Latin American NUAM Market

ID: `etf-ax-hierarchical-risk-parity-for-portfolio-allocation-`
Family: ETFs and Macro
Retail feasibility: **C**
As of: 2026-11-27
Bead: `bkt-q5moa.15`
Origin: arXiv q-fin.TR or q-fin.PM 2015 to 2026

## Logic

From the abstract: HRP leverages hierarchical clustering and recursive bisection to allocate risk in a manner that is both interpretable and stable--avoiding the need to invert the covariance matrix, a common limitation in the traditional mean-variance optimization. These findings highlight HRP's potential as a practical and resilient asset allocation framework for investors operating in the integrated, high-volatility markets like NUAM.

## Source

1. Hierarchical Risk Parity for Portfolio Allocation in the Latin American NUAM Market. Gonzalo Ramirez-Carrillo and co-authors, 2025, arXiv 2509.03712. https://arxiv.org/abs/2509.03712 (arXiv API, fetched 2026-11-27)

## Claimed Edge

The abstract reports: Using daily data from 54 constituent stocks of the MSCI NUAM Index from 2019 to 2025, we compare the performance of HRP against two standard benchmarks: an equally weighted portfolio (1/N) and a maximum Sharpe ratio portfolio. Results show that while the Max Sharpe portfolio yields the highest return, the HRP portfolio delivers a smoother risk-return profile, with lower drawdowns and tracking error.

## Post-Publication Decay

Single arXiv study with no out-of-sample follow-up fetched. Grade C.

## Capacity

Unknown; the abstract gives no capacity figure. Treat as Small until tested.

## Data Needed

[D-market](../../03-data-sources/cards/D-market.md)

## Implementation

No open-source implementation in `code/`.

Grades: A retail with free data and a small account; B retail with paid data, margin or more capital; C edge thin after retail costs or needs low latency; D institutional balance sheet or access; F closed or not feasible.
