# polymarket-paper-trader

https://github.com/agent-next/polymarket-paper-trader. License MIT. Stars 506. Last push 2026-11-01. Python. Checked 2026-11-27.

## Architecture
Package `pm_trader/`: `engine.py` (paper account, buy and sell, venue routing), `orderbook.py` (fill walk with slippage and fees), `orders.py` (limit orders), `api.py` and `kalshi_api.py` (venue clients), `db.py` (SQLite), `backtest.py`, `analytics.py`, `cli.py`, `mcp_server.py`. Extras: `benchmark/pm_benchmark`, `leaderboard-server` (FastAPI), `leaderboard-client`.

## Data Layer
Live Polymarket and Kalshi books and midpoints over REST. SQLite account store. Backtests replay CSV or JSON price snapshots with a synthetic book.

## Event Loop
None. CLI or MCP calls drive each action. Server jobs resolve markets and check resting orders.

## Execution
Paper fills against real books with the exchange fee schedule and tick-size checks. Starting balance 10,000 dollars.

## Risk
Order validation: tradable market, tick size, balance. Example strategies set stop loss and position caps.

## Strategies Shipped
`examples/`: `momentum.py`, `mean_reversion.py`, `limit_grid.py`, `jev_edge.py`.

## AI Components
`benchmark` scores LLM forecasts on market sets by Brier score and calibration. An MCP server and agent skill expose trading tools.

## Connectors
Polymarket and Kalshi.

## Fit
Safe sandbox for agent trading and forecast evaluation with realistic fees and fills.
