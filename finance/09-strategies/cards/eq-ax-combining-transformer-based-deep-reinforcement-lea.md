# Combining Transformer based Deep Reinforcement Learning with Black-Litterman Model for Portfolio Optimization

ID: `eq-ax-combining-transformer-based-deep-reinforcement-lea`
Family: Equities
Retail feasibility: **C**
As of: 2026-11-27
Bead: `bkt-q5moa.15`
Origin: arXiv q-fin.TR or q-fin.PM 2015 to 2026

## Logic

From the abstract: Since the dynamic correlations among portfolio assets are key in optimizing the portfolio, the lack of such knowledge makes it difficult for the DRL agent to maximize the return per unit of risk, when the target market permits short selling (i.e., the US stock market). In this research, we propose a hybrid portfolio optimization model combining the DRL agent and the Black-Litterman (BL) model to enable the DRL agent to learn the dynamic correlation between the portfolio asset returns and implement an efficacious long/short strategy based on the correlation.

## Source

1. Combining Transformer based Deep Reinforcement Learning with Black-Litterman Model for Portfolio Optimization. Ruoyu Sun and co-authors, 2024, arXiv 2402.16609. https://arxiv.org/abs/2402.16609 (arXiv API, fetched 2026-11-27)

## Claimed Edge

The abstract reports: Empirical results of the experiments conducted on real-world United States stock market data demonstrate that our DRL agent by a wide margin outperforms various comparison portfolio choice strategies and alternative DRL frameworks by at least 42% in terms of accumulated return. In terms of the return per unit of risk, our DRL agent by a wide margin outperforms various comparative portfolio choice strategies and alternative strategies based on other machine learning frameworks.

## Post-Publication Decay

Single arXiv study with no out-of-sample follow-up fetched. Grade C.

## Capacity

Unknown; the abstract gives no capacity figure. Treat as Small until tested.

## Data Needed

[D-market](../../03-data-sources/cards/D-market.md)

## Implementation

No open-source implementation in `code/`.

Grades: A retail with free data and a small account; B retail with paid data, margin or more capital; C edge thin after retail costs or needs low latency; D institutional balance sheet or access; F closed or not feasible.
