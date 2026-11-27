# QTPyLib

https://github.com/ranaroussi/qtpylib. License Apache-2.0. Stars 2,271. Last push 2021-09-22. Python. Checked 2026-11-27.

## Architecture
`qtpylib/blotter.py` is the data collector and recorder; `broker.py` is the abstract order manager; `algo.py` subclasses `Broker` and runs user strategies; `instrument.py` wraps a symbol for strategy use; `indicators.py`, `talib_indicators.py` and `futures.py` hold analytics; `reports.py` and `_webapp` give a dashboard; `schema.sql` defines MySQL tables.

## Data Layer
Blotter subscribes to Interactive Brokers ticks, quotes, bars and order books through `ezibpy`, logs them to MySQL via pymysql and broadcasts over ZeroMQ. Algo loads history from the same store.

## Event Loop
Callback loop: `on_start`, `on_quote`, `on_tick`, `on_bar`, `on_orderbook`, `on_fill`, driven by IB messages and a stale-tick timer. Backtest mode replays from CSV or the database.

## Execution
`Algo.order` and `Instrument.order` send IB orders: market, limit, bracket with target and initial stop, trailing stop, combos and order modification. Orphan and expired order cleanup in `Broker`.

## Risk
Bracket stops and expiry of pending orders. No account level limits.

## Strategies Shipped
`examples/strategy.py`: every tenth tick on ES futures, random side bracket order with 0.5 tick target and stop, exit after five ticks. Demonstration only.

## AI Components
None.

## Connectors
Interactive Brokers, MySQL, ZeroMQ, Twilio SMS.

## Fit
Template for an IB tick recorder plus strategy runner. Dormant since 2021 and pinned to old ezibpy; borrow the blotter and bracket-order design.
