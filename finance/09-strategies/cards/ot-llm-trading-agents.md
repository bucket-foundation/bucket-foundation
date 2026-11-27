# LLM Trading Agents

ID: `ot-llm-trading-agents`
Family: Other
Retail feasibility: **C**
As of: 2026-11-27
Bead: `bkt-q5moa.5`

## Logic

Multiple LLM agents analyze fundamentals, news and sentiment and vote on trades.

## Source

1. TradingAgents: Multi-Agents LLM Financial Trading Framework. arXiv. https://arxiv.org/abs/2412.20138 (arXiv abstract page, fetched 2026-11-27)

## Claimed Edge

TradingAgents reports better backtest returns than baselines over a few months.

## Post-Publication Decay

Short tests and look-ahead risk from model training data.

Decay source: TradingAgents: Multi-Agents LLM Financial Trading Framework. arXiv. https://arxiv.org/abs/2412.20138 (arXiv abstract page, fetched 2026-11-27)

## Capacity

Small.

## Data Needed

[D-market](../../03-data-sources/cards/D-market.md), [D-filings](../../03-data-sources/cards/D-filings.md)

## Implementation

[tradingagents](../../08-software/tradingagents.md), [ai-hedge-fund](../../08-software/ai-hedge-fund.md), [finmem](../../08-software/finmem.md)

## Merged Duplicates

Same logic found in bead `bkt-q5moa.15` sources:

- code FinMem: puppy/agent.py
- code LLM-Trading-Lab: Experiments/chatgpt_micro-cap/scripts/processing/trading_script.py
- code OctoBot: packages/tentacles/Trading/Mode/ai_trading_mode
- code lumibot: lumibot/example_strategies/agent_macro_risk.py
- code lumibot: lumibot/example_strategies/ai_trading_team_*.py
- code virattt/ai-hedge-fund: hedge_fund/signals/buffett.py
- code virattt/ai-hedge-fund: hedge_fund/signals/druckenmiller.py
- code virattt/ai-hedge-fund: hedge_fund/signals/graham.py
- code virattt/ai-hedge-fund: hedge_fund/signals/lynch.py
- code virattt/ai-hedge-fund: hedge_fund/signals/munger.py
- code virattt/ai-hedge-fund: hedge_fund/strategies/deep-value.yaml
- code virattt/ai-hedge-fund: hedge_fund/strategies/fundamental-ls.yaml
- code virattt/ai-hedge-fund: hedge_fund/strategies/inflections.yaml

Grades: A retail with free data and a small account; B retail with paid data, margin or more capital; C edge thin after retail costs or needs low latency; D institutional balance sheet or access; F closed or not feasible.
