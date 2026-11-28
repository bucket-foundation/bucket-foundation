# trading-server

https://github.com/s-brez/trading-server. License GNU General Public License v3.0. Stars 679. Last Push 2023-07-06. Python 3.9. Checked 2026-11-27.

## Architecture
Flat modules: `server.py` (orchestrator), `data.py`, `strategy.py`, `model.py`, `features.py`, `portfolio.py`, `broker.py`, `exchange.py`, `bitmex.py`, `bitmex_ws.py`, `messaging_clients.py`, `api.py`, `event_types.py`, `trade_types.py`.

## Data Layer
MongoDB stores one-minute OHLCV bars and trade records. `resample.py` and `strategy.py` build higher timeframes and feature frames from the bars. Ticks convert to one-minute bars and are not stored.

## Event Loop
Event queue with `MarketEvent`, `SignalEvent`, `OrderEvent` and `FillEvent` types passed between data, strategy, portfolio and broker.

## Execution
`broker.py` turns approved signals into orders on the exchange adapter; BitMEX is the complete venue. Telegram consent lets an operator accept, veto or edit a trade first.

## Risk
`portfolio.py` caps simultaneous positions at 20 and correlated positions at 4, sets a 25 percent drawdown limit, sizes risk per trade (0.5 percent or Kelly) and allocates capital per strategy.

## Strategies Shipped
`model.py` holds an abstract `Model` and one test-only EMA cross model.

## AI Components
None.

## Connectors
BitMEX REST and websocket, Telegram. Binance, IG, Interactive Brokers and Deribit are planned.

## Fit
Clean skeleton for portfolio-level risk and human-in-the-loop approval. Only one venue and no real strategies, so it is a pattern to borrow.
