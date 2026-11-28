# qtrader

https://github.com/josephchenhk/qtrader. License not stated. Stars 549. Last push 2026-09-07. Python. Checked 2026-11-27.

## Architecture
Package `qtrader/`. `core/` holds `strategy.py` (`BaseStrategy` with `on_bar` and `on_tick`), `portfolio`, `position`, `order`, `balance`, `data`. `gateways/` has `backtest`, `ib`, `futu` and `cqg`. `plugins/` has `analysis`, `clickhouse`, `sqlite3`, `monitor`, `telegram`. The `engine` and `event_engine` modules ship only as compiled binaries for Windows, macOS and Linux.

## Data Layer
Bars and ticks through gateway classes. ClickHouse and SQLite plugins store data. `finta` computes indicators in the demo.

## Event Loop
Event engine in the compiled `event_engine`; strategies receive bars and ticks through callbacks.

## Execution
Same strategy runs in backtest and live through `BaseGateway` subclasses. Per-venue fee modules (`ib_fees`, `futu_fees`, `cqg_fees`). Orders carry direction, offset and order type.

## Risk
Portfolio and balance tracking per gateway. No separate risk module in source.

## Strategies Shipped
`examples/demo_strategy/demo_strategy.py` only, built on `finta` indicators.

## AI Components
None.

## Connectors
Interactive Brokers, Futu, CQG, a backtest gateway and Telegram alerts.

## Fit
Multi-gateway event framework for equities and futures. The closed binary engine and missing license limit reuse and audit.
