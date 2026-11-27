# Empirical Analysis of Indirect Internal Conversions in Cryptocurrency Exchanges

ID: `cy-ax-empirical-analysis-of-indirect-internal-conversion`
Family: Crypto
Retail feasibility: **C**
As of: 2026-11-27
Bead: `bkt-q5moa.15`
Origin: arXiv q-fin.TR or q-fin.PM 2015 to 2026

## Logic

From the abstract: In this paper, we build a set of methodologies to characterize and empirically measure different algorithmic trading strategies in Binance, a large centralized cryptocurrency exchange, using a complete data set of historical trades. We find that a sub-strategy of triangular arbitrage is widespread, where bots convert between two coins through an intermediary coin, and obtain a favorable exchange rate compared to the direct one.

## Source

1. Empirical Analysis of Indirect Internal Conversions in Cryptocurrency Exchanges. Paz Grimberg and co-authors, 2020, arXiv 2002.12274. https://arxiv.org/abs/2002.12274 (arXiv API, fetched 2026-11-27)

## Claimed Edge

The abstract reports: We measure the profitability of this strategy, characterize its risks, and outline two strategies that algorithmic trading bots use to mitigate their losses. We find that this strategy yields an exchange ratio that is $0.144\%$, or $14.4$ basis points (bps) better than the direct exchange ratio. $2.71\%$ of all trades on Binance are attributable to this strategy.

## Post-Publication Decay

Single arXiv study with no out-of-sample follow-up fetched. Grade C.

## Capacity

Unknown; the abstract gives no capacity figure. Treat as Small until tested.

## Data Needed

[D-onchain](../../03-data-sources/cards/D-onchain.md)

## Implementation

No open-source implementation in `code/`.

Grades: A retail with free data and a small account; B retail with paid data, margin or more capital; C edge thin after retail costs or needs low latency; D institutional balance sheet or access; F closed or not feasible.
