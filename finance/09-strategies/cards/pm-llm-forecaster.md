# LLM Forecasting Agents

ID: `pm-llm-forecaster`
Family: Prediction Markets
Retail feasibility: **B**
As of: 2026-11-27
Bead: `bkt-q5moa.5`

## Logic

Use an LLM with retrieval to forecast event probabilities and trade where it disagrees with price.

## Source

1. Approaching Human-Level Forecasting with Language Models. arXiv. https://arxiv.org/abs/2402.18563 (arXiv abstract page, fetched 2026-11-27)

## Claimed Edge

Halawi and co-authors report an LLM system near the crowd aggregate of human forecasters.

## Post-Publication Decay

Untested as a trading edge after fees.

Decay source: Approaching Human-Level Forecasting with Language Models. arXiv. https://arxiv.org/abs/2402.18563 (arXiv abstract page, fetched 2026-11-27)

## Capacity

Small.

## Data Needed

[D-onchain](../../03-data-sources/cards/D-onchain.md)

## Implementation

[polymarket-agents](../../08-software/polymarket-agents.md), [kalshi-ai-trading-bot](../../08-software/kalshi-ai-trading-bot.md)

## Merged Duplicates

Same logic found in bead `bkt-q5moa.15` sources:

- code Polymarket/agents: agents/application/creator.py
- code Polymarket/agents: agents/application/trade.py one_best_trade
- code kalshi-ai-trading-bot: src/strategies/category_scorer.py

Grades: A retail with free data and a small account; B retail with paid data, margin or more capital; C edge thin after retail costs or needs low latency; D institutional balance sheet or access; F closed or not feasible.
