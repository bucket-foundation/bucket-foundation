# risk-aware-trading-agents

https://github.com/jackson-cmd/risk-aware-trading-agents. License MIT. Stars 484. Last push 2026-11-26. Python. Checked 2026-11-27.

## Architecture
Package `src/riskaware/`: `engine.py`, `agents/` (`fundamental`, `macro`, `news`, `technical`), `strategy/` (`risk_aware`, `swing`, `options_strategies`, `examples`), `risk.py`, `guards.py`, `sizing.py`, `backtest/`, `brokers/`, `news/`, `llm/`, `arena.py`, `scheduler.py`, `mcp_server.py`, `dashboard/`. A `leaderboard/` and `site/` publish results.

## Data Layer
Prices, fundamentals, events and sentiment in `data/`. News from open feeds and SEC filings with timestamps kept to the minute, plus cross-source verification in `news/verify.py`.

## Event Loop
A scheduler runs `riskaware agents run --scheduled` every 15 minutes on weekdays. The news backtest replays headlines by publish minute and fills at the next open.

## Execution
Broker adapters on a `base.py` interface: Alpaca, Futu, IBKR, Longbridge, Public, Schwab, Tastytrade, Tiger, Tradier, plus a paper broker.

## Risk
`RiskManager` checks `PlannedOrder` objects. `Guards` holds a global stop flag that blocks orders until cleared. Market regime from VIX and FOMC and CPI dates. Cash floor of 30 percent.

## Strategies Shipped
`examples/strategies/`: `vix_fear_dip.py` (buy broad ETFs when fear is high), `news_earnings_drift.py`, `reference_strategies.py`.

## AI Components
`llm/` providers (Anthropic, OpenAI-compatible, CLI) and a reviewer. An arena ranks LLM trading agents. MCP server included.

## Connectors
Ten broker adapters listed above.

## Fit
Most complete US-equity agent framework in this batch, with explicit guards and a timestamp-news backtest.
