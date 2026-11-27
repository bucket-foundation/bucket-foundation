# quanttrader

https://github.com/letianzj/quanttrader. License Apache-2.0. Stars 788. Last push 2024-06-20. Python (repo language tag reads HTML because of committed docs). Checked 2026-11-27.

## Architecture
Package `quanttrader/` with `event/` engines, `data/` feeds, `brokerage/`, `order/`, `position/`, `account/`, `risk/`, `performance/`, `strategy/` and a PyQt5 control `gui/`. `backtest_engine.py` and `examples/live_engine.py` are the two entry points.

## Data Layer
Backtest feed reads historical CSV. Live feed pulls ticks and bars from Interactive Brokers. `tick_recorder` and `trade_recorder` write logs. Contract metadata in `instrument_meta.yaml`.

## Event Loop
Event driven with separate `BacktestEventEngine` and `LiveEventEngine` queues. Strategies receive `on_tick` events. The same strategy class runs in both modes.

## Execution
`BacktestBrokerage` simulates fills. `IBBrokerage` talks to TWS or IB Gateway. Order manager tracks status and fills.

## Risk
`RiskManager.order_in_compliance` checks order time windows, single trade limit and total trade limit per strategy from config. A `PassThroughRiskManager` skips checks. `margin_manager.py` computes margin.

## Strategies Shipped
In `examples/strategy/`: dual thrust, dual time frame, moving average cross, double moving average cross, active buy sell strength, order per interval, and buy and hold.

## AI Components
None.

## Connectors
Interactive Brokers for stocks, futures, options and forex.

## Fit
Compact event-driven stack with a risk gate and a desktop monitor. Single broker.
