# Jesse

https://github.com/jesse-ai/jesse · MIT · 8,840 stars · last push 2026-11-23 · Python · checked 2026-11-27

## Architecture
Crypto research and trading framework with a FastAPI backend and a web dashboard (`jesse/app.py`, `jesse/controllers/`, `jesse/static/`). Strategies subclass `jesse/strategies/Strategy.py` and implement `should_long`, `should_short`, `go_long`, `go_short`, `update_position`. Routes map strategy, exchange, symbol and timeframe.

## Data Layer
Candles import from exchanges into Postgres (`jesse/modes/import_candles_mode/`), with Redis for live state. In-memory `jesse/store/` holds candles, orders, positions during a run. 176 indicator modules in `jesse/indicators/`.

## Event Loop
Backtest steps one-minute candles and builds higher timeframes in memory (`jesse/modes/backtest_mode.py`), so multi-timeframe routes stay aligned and lookahead is blocked. Live mode ships in the paid `jesse-live` plugin.

## Execution
Market, limit and stop orders with simulated fills in backtest; `jesse/exchanges/sandbox/` for simulated exchange. Spot and futures with leverage, isolated and cross margin, liquidation modeling.

## Risk
Position sizing helpers in `jesse/utils.py` (`risk_to_qty`, `size_to_qty`). Stop loss and take profit attached in `go_long`. Validation in `jesse/modes/monte_carlo_mode/MonteCarloRunner.py` (trade shuffling and candle noise), `jesse/modes/significance_test_mode/SignificanceTestRunner.py` (rule significance test), and Optuna-based optimize mode with train and test split (`jesse/modes/optimize_mode/`).

## Strategies Shipped
The `jesse/strategies/` folder holds about 180 test fixtures (`Test01` to `Test48`, `TestLiquidation...`) that exercise the engine. Three are trading logic:
- `jesse/strategies/RealStrategyRegression1/__init__.py`: long when local and 4h trend agree, ADX above threshold, CMO above threshold and Stochastic RSI below 20; Alligator and long-term MA filters.
- `jesse/strategies/RealStrategyRegression2/__init__.py`: Donchian channel breakout above the upper band with price over 4h SMA and ATR above its average; mirrored short.
- `jesse/strategies/RealStrategyRegression3/__init__.py`: long when DI+ over DI-, ADX above 50 and Williams %R below -80; short on the mirror with %R above -20.
Public example strategies live in the separate `jesse-ai/example-strategies` repo.

## AI Components
MCP server in `jesse/mcp/` (tools for backtest, optimize, Monte Carlo, significance test, candles, strategy catalog, live) with agent rules in `jesse/mcp/agent_rules.md`, so an LLM agent can write and test strategies. `jesse/research/ml.py` helpers for ML features.

## Connectors
Via plugin: Binance spot and futures, Bybit, Coinbase, Apex, Hyperliquid, Gate (live needs the paid plugin). Notifications in `jesse/services/notifier.py` (Telegram, Discord).

## Fit
Clean crypto backtester with built-in Monte Carlo and significance testing, and the MCP server suits LLM-driven research. Live trading is paywalled.
