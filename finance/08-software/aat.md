# aat

https://github.com/AsyncAlgoTrading/aat. License Apache-2.0. Stars 841. Last push 2026-07-27. Python with C++ acceleration. Checked 2026-11-27.

## Architecture
`aat/engine` holds a trading engine plus dispatch managers for risk, portfolio, execution and order entry. `aat/core` has instrument, order book, order and trade types with optional C++ twins in `aat/cpp`. One `Strategy` class serves backtest and live.

## Data Layer
Exchange classes stream market data. CSV and Kafka generic feeds, a synthetic exchange server, and a limit order book with fill-or-kill and all-or-nothing flags.

## Event Loop
asyncio event loop. Strategies implement `onTrade`, `onBought`, `onSold`, `onReceived`, `onRejected` and `onCanceled`.

## Execution
Execution manager passes orders through to the exchange. Order entry and market data are separate base classes per venue.

## Risk
`RiskManager` tracks active orders and restricted trading hours per strategy. Position limits are a stub in the strategy mixin (`# TODO`).

## Strategies Shipped
`sell_plus_percent.py`, IEX `golden_death.py` (30/10 moving average cross) and `momentum.py` (intraday trigger, profit and stop in basis points), plus buy-and-hold and read-only samples for Coinbase, IB, IEX and CSV.

## AI Components
None.

## Connectors
Interactive Brokers, IEX, TD Ameritrade, Coinbase, Kafka, CSV.

## Fit
Clean async event architecture with a real order book. Several connectors (TDA, IEX Cloud) target retired APIs.
