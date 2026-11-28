# Blankly

https://github.com/blankly-finance/blankly. License LGPL-3.0. Stars 2,485. Last push 2024-12-30. Python. Checked 2026-11-27.

## Architecture
`blankly/exchanges/interfaces/` holds one adapter per venue behind `abc_exchange_interface.py`; `frameworks/strategy/strategy.py` and `strategy_base.py` run user strategies; `frameworks/model`, `screener` and `multiprocessing` add model and scan runners; `deployment/` is the cloud CLI.

## Data Layer
`data/data_reader.py` reads historical OHLCV; `exchanges/managers/orderbook_manager.py` keeps websocket books; keyless mode backtests without an account.

## Event Loop
`Strategy` schedules callbacks per symbol: price events on a bar interval, orderbook websocket events, and scheduled functions; backtest replays the same callbacks on historical bars.

## Execution
Unified interface for market, limit and stop orders, plus futures interfaces. Paper-trade interface wraps any exchange with a local account.

## Risk
No risk module. Callers use the account state exposed through the interface.

## Strategies Shipped
`examples/`: golden_cross, macd, rsi, rsi_screener, take_profit, leveragedSPY, futures_rsi, mlp_model.

## AI Components
`frameworks/model` base class with an MLP example.

## Connectors
Alpaca, Binance, Binance futures, Coinbase Pro and Advanced, FTX, KuCoin, OKX, Oanda, keyless data.

## Fit
Reference for a unified live, paper and backtest strategy API in one callback model. Several venues (FTX) are dead.
