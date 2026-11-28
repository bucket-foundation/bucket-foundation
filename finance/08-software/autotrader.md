# AutoTrader

https://github.com/kieran-mackle/AutoTrader. License GPL-3.0. Stars 1,276. Last push 2025-05-04. Python. Checked 2026-11-27.

## Architecture
`autotrader/autotrader.py` holds the `AutoTrader` class (`configure`, `add_strategy`, `add_data`, `backtest`, `optimise`, `scan`, `run`). `autobot.py` holds `AutoTraderBot`, one per strategy and instrument. `strategy.py` defines the `Strategy` base class. Also `indicators.py`, `autoplot.py`, `comms/` (Telegram notifier), `bin/cli.py` and `brokers/`.

## Data Layer
Candles from the broker or from Yahoo Finance, from local files, or passed as DataFrames. No database.

## Event Loop
Bar loop. Each tick the bot updates data, calls the strategy's `generate_signal(dt)`, checks and qualifies the returned orders, and submits them. Backtests step through history with the same code path against the virtual broker.

## Execution
Common `Broker` interface (`place_order`, `cancel_order`, `get_positions`, `get_candles`, `get_NAV`) implemented for Interactive Brokers, OANDA, CCXT and a `virtual` paper broker. `Order` objects carry stop loss and take profit.

## Risk
Order validation in `_check_orders` and `_qualify_orders`; stop loss and take profit on orders. Position sizing is the strategy's job.

## Strategies Shipped
None in the package; user strategies subclass `Strategy`. `indicators.py` has 38 indicator functions.

## AI Components
None.

## Connectors
Interactive Brokers, OANDA, CCXT exchanges, Yahoo Finance, Telegram.

## Fit
Compact bar-based framework that reaches paper, backtest and live from one strategy class. Optimiser and scanner modes are included. GPL-3.0.
