# maverick-mcp

https://github.com/wshobson/maverick-mcp. License MIT. Stars 737. Last push 2026-11-13. Python 3.12+. Checked 2026-11-27.

## Architecture
Package `maverick/` split into `market_data`, `technical`, `screening`, `portfolio`, `backtesting`, `research`, `platform` and `server`. Each domain has `service.py` and `tools.py` for MCP exposure. `evals/` holds tool-surface judging.

## Data Layer
`yfinance` through fetchers with cache. Local SQLAlchemy database for portfolio, watchlists and a trade journal. No API key needed for core tools.

## Event Loop
None. MCP request and response. Backtests run vectorized on vectorbt.

## Execution
None. The README says it does not place orders.

## Risk
`portfolio/risk.py` computes a dashboard, position risk checks, regime-adjusted sizing and alerts.

## Strategies Shipped
`backtesting/strategies/templates.py` catalog: SMA cross, RSI, MACD, Bollinger, momentum, EMA cross, mean reversion, breakout, volume momentum, plus online learning, regime-aware and ensemble. `screening/screens.py` scores bullish, bearish and supply-demand setups.

## AI Components
`backtesting/strategies/ml/` (regime detector, online learning, ensemble voting) and `research/agents/` (LangGraph-style subagents with synthesis). LLM calls through `platform/llm.py`.

## Connectors
Yahoo Finance, MCP clients such as Claude Desktop, Cursor and VS Code, optional web search for research.

## Fit
Good model of a local read-only analysis MCP with a backtest layer. No broker leg.
