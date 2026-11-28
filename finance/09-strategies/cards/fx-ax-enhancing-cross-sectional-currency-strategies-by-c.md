# Enhancing Cross-Sectional Currency Strategies by Context-Aware Learning to Rank with Self-Attention

ID: `fx-ax-enhancing-cross-sectional-currency-strategies-by-c`
Family: FX
Retail feasibility: **C**
As of: 2026-11-27
Bead: `bkt-q5moa.15`
Origin: arXiv q-fin.TR or q-fin.PM 2015 to 2026

## Logic

From the abstract: Although the rankers at the core of these strategies are learned globally and improve ranking accuracy on average, they ignore the differences between the distributions of asset features over the times when the portfolio is rebalanced. We tackle this shortcoming with an analogous idea from information retrieval: that a query's top retrieved documents or the local ranking context provide vital information about the query's own characteristics, which can then be used to refine the initial ranked list.

## Source

1. Enhancing Cross-Sectional Currency Strategies by Context-Aware Learning to Rank with Self-Attention. Daniel Poh and co-authors, 2021, arXiv 2105.10019. https://arxiv.org/abs/2105.10019 (arXiv API, fetched 2026-11-27)

## Claimed Edge

The abstract reports: Backtesting on a slate of 31 currencies, our proposed methodology increases the Sharpe ratio by around 30% and by a wide margin enhances various performance metrics. Additionally, this approach also improves the Sharpe ratio when separately conditioning on normal and risk-off market states.

## Post-Publication Decay

Single arXiv study with no out-of-sample follow-up fetched. Grade C.

## Capacity

Unknown; the abstract gives no capacity figure. Treat as Small until tested.

## Data Needed

[D-market](../../03-data-sources/cards/D-market.md)

## Implementation

No open-source implementation in `code/`.

Grades: A retail with free data and a small account; B retail with paid data, margin or more capital; C edge thin after retail costs or needs low latency; D institutional balance sheet or access; F closed or not feasible.
