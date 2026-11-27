# QuantDinger

https://github.com/OpenByteInc/QuantDinger. License Apache-2.0. Stars 14,018. Last push 2026-11-27. Python backend, Vue frontend. Checked 2026-11-27.

## Architecture
Self-hosted "agentic trading OS". Flask and Celery backend in `backend_api_python/app/` with services for AI research, indicator authoring, factor discovery, backtests, live trading, billing and multi-tenant SaaS. `library/strategies/` holds 200 strategy scripts with a `initialize(context)` and handler API; `library/indicators/` holds indicators.

## Data Layer
Data providers for crypto exchanges, US equities, forex and fundamentals; Postgres and Redis.

## Event Loop
Celery workers and runtime hosts run strategies per bar; backtests run as jobs.

## Execution
`services/live_trading/`: Binance (spot and futures), Bybit, OKX, Bitget, Gate, HTX adapters; `alpaca_trading` and `ibkr_trading` services. Fill reconciliation, execution lock, limit price safety, dry-run deviation tracking.

## Risk
Account risk service, position ownership, native exchange protection orders, backtest limits.

## Strategies Shipped
200 files in `library/strategies/`, most ported from TradingView community scripts: Bollinger and Donchian breakouts, EMA and SMA crosses, Supertrend variants, UT Bot, Ichimoku, turtle, RSI reversion and divergence, VWAP pullbacks, PMAX, OTT, SMC zones, grid scalping, ORB, gap fill, Larry Connors. Full list in `STRATEGIES-IN-CODE.md`.

## AI Components
AI copilot, AI indicator and strategy generation, AI decision filter, AI market reports, factor mining, MCP and agent token service.

## Connectors
Six crypto exchanges, Alpaca, IBKR.

## Fit
Broadest strategy library found. The scripts are TradingView ports with no out-of-sample evidence; treat them as candidates for the overfitting grader.
