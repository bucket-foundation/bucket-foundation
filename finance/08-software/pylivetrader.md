# pylivetrader

https://github.com/alpacahq/pylivetrader. License Apache-2.0. Stars 685. Last Push 2022-10-04. Python. Checked 2026-11-27.

## Architecture
Package `pylivetrader/` of about 2,000 lines: `algorithm.py` (`LiveTrading` algorithm with the zipline API), `executor/`, `backend/` (`base.py`, `alpaca.py`), `data/`, `assets/`, `statestore/`, `misc/events.py`, `loader.py`. The loader rewrites zipline imports so existing Quantopian algorithms run live.

## Data Layer
`data_portal.py` and `bardata.py` serve bars from the backend. Pipeline data comes from the companion pipeline-live package. A statestore persists algorithm context between restarts.

## Event Loop
`AlgorithmExecutor` iterates a `RealtimeClock` that emits session start, minute bar and before-trading-start events, then calls `handle_data` and scheduled functions through `EventManager` rules.

## Execution
Orders route through the backend interface; the Alpaca backend submits and polls orders and positions.

## Risk
Zipline trading controls: `set_max_leverage`, `set_max_position_size`, `set_max_order_size`, `set_max_order_count`, each failing or logging on breach.

## Strategies Shipped
Examples only: MACD, portfolio management and a pipeline example in `examples/`.

## AI Components
None.

## Connectors
Alpaca. The backend base class is the extension point for other brokers.

## Fit
Migration path for zipline-style algorithms to live Alpaca trading. Idle since 2022 and tied to a legacy API, so it serves as design reference.
