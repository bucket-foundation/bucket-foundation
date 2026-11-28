# fast-trade

https://github.com/jrmeier/fast-trade. License AGPL-3.0. Stars 607. Last push 2026-10-16. Python. Checked 2026-11-27.

## Architecture
Library and CLI in `fast_trade/`: `run_backtest.py` (entry), `build_data_frame.py` (indicators), `evaluate.py` and `logic_utils.py` (rule engine), `build_summary.py` and `summary/` (metrics), `validate_backtest.py`, `portfolio.py`, `ml/`, `mcp_server.py`, and `archive/` for downloads.

## Data Layer
Polars frames. `archive/` pulls klines from Binance and Coinbase into a local store. `finta.py` and `transformers_map.py` supply indicators. `fxmacrodata.py` adds macro series.

## Event Loop
Vectorized backtests over a frame; `can_vectorize_logic` falls back to a row loop when rules need lookback frames. `run_parallel_example.py` fans runs across processes.

## Execution
Simulated fills with a commission field. `portfolio.py` keeps state, trade log and parquet files for paper accounts via `apply_action`.

## Risk
Stop loss and trailing stop loss columns built in `build_data_frame.py`, plus take profit rules in the logic. No live risk checks.

## Strategies Shipped
YAML examples only: `example_backtest.yml` (RSI plus ZLEMA crossover on BTCUSD, 4H), `regime_example.yml`, `hmm_screen_example.yml`. Strategies are datapoint lists plus enter and exit rules.

## AI Components
`ml/`: HMM regime training and screening, a classifier, a genetic-algorithm strategy `evolver.py` (pygad) and walk-forward splits. `mcp_server.py` exposes backtest, download and regime tools to agents.

## Connectors
Binance and Coinbase historical data. No order routing.

## Fit
Compact config-driven backtester with an MCP front end. AGPL limits reuse inside closed products.
