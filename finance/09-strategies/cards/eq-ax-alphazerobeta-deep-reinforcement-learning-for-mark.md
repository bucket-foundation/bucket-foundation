# AlphaZeroBeta: Deep Reinforcement Learning for Market-Neutral Portfolios

ID: `eq-ax-alphazerobeta-deep-reinforcement-learning-for-mark`
Family: Equities
Retail feasibility: **C**
As of: 2026-11-27
Bead: `bkt-q5moa.15`
Origin: arXiv q-fin.TR or q-fin.PM 2015 to 2026

## Logic

From the abstract: Market-neutral portfolios aim to generate consistent returns while offsetting systematic market risk.

## Source

1. AlphaZeroBeta: Deep Reinforcement Learning for Market-Neutral Portfolios. Boris Belyakov, 2026, arXiv 2607.18001. https://arxiv.org/abs/2607.18001 (arXiv API, fetched 2026-11-27)
2. Published version: https://doi.org/10.1186/s40854-026-00955-4 (DOI listed by the arXiv API, fetched 2026-11-27)

## Claimed Edge

The abstract reports: We propose AlphaZeroBeta, a deep reinforcement learning framework designed to deliver benchmark-relative alpha (excess returns) with near-zero beta (market neutrality). AlphaZeroBeta combines a composite reward function that balances risk-adjusted excess return, benchmark correlation, and transaction costs with a CNN-GRU policy trained end-to-end via Recurrent PPO and evaluated through a rolling walk-forward protocol.

## Post-Publication Decay

Single arXiv study with no out-of-sample follow-up fetched. Grade C.

## Capacity

Unknown; the abstract gives no capacity figure. Treat as Small until tested.

## Data Needed

[D-market](../../03-data-sources/cards/D-market.md)

## Implementation

No open-source implementation in `code/`.

Grades: A retail with free data and a small account; B retail with paid data, margin or more capital; C edge thin after retail costs or needs low latency; D institutional balance sheet or access; F closed or not feasible.
