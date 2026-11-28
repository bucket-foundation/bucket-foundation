# AKQuant

https://github.com/akfamily/akquant. License MIT. Stars 2,645. Last push 2026-11-27. Rust core with a Python API. Checked 2026-11-27.

## Architecture
Rust engine in `src/` (`engine/core.rs`, `pipeline/stages`, `order_manager.rs`, `order_ledger.rs`, `portfolio.rs`, `settlement`, `margin`, `risk`, `calendar`) exposed through PyO3. Python layer in `python/akquant/`: `strategy.py` (class API), `live/_runner.py`, `gateway/`, `factor/`, `ml/`, `mcp/`, `signal/`, `plot/`, `talib/`.

## Data Layer
Rust `data/` holds a bar aggregator, windowing and a feed client; Python `feed_adapter.py` and `data.py` load frames. Checkpoint and warm-start support.

## Event Loop
Backtest runs as staged pipeline over an event manager in Rust. Live mode is a Python runner (`live/_runner.py`) fed by gateway callbacks.

## Execution
`SimulatedExecution` in Rust models fills, margin and settlement for stocks, futures and options. Live orders go through `gateway/order_submitter.py` and broker adapters with recovery and event-audit modules.

## Risk
`RiskManager` with rule objects: restricted list, max order size, max order value, max position size, plus futures, option, portfolio and per-strategy limit rules; margin liquidation priority.

## Strategies Shipped
Sixty-plus example scripts under `examples/`, including parameter optimization, walk-forward ML, target-weight rebalancing and trailing orders.

## AI Components
`ml/model.py` wraps sklearn style models for walk-forward training; `mcp/server.py` exposes backtests to agents.

## Connectors
CTP futures gateway (native), replay gateway, plugin registry for custom brokers.

## Fit
Fast backtester for China futures and A-share style rules with a path to live CTP. Heavy to read; use as a reference for staged order pipelines and margin accounting.
