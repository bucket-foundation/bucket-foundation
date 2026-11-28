# alpaca-py

https://github.com/alpacahq/alpaca-py. License Apache-2.0. Stars 1,613. Last push 2026-11-27. Python. Checked 2026-11-27.

## Architecture
Official SDK. `alpaca/trading` (orders, positions, account), `alpaca/data` (historical and live market data), `alpaca/broker` (broker API for apps that open accounts). Pydantic request and response models.

## Data Layer
Stock, crypto, options and news data over REST and websocket (`StockDataStream`, `CryptoDataStream`).

## Event Loop
`TradingStream` websocket delivers trade updates; data streams run their own asyncio loop.

## Execution
Market, limit, stop, stop-limit, trailing stop, bracket, OCO, OTO; equities, options and crypto; paper and live endpoints share the code path.

## Risk
None beyond the broker.

## Strategies Shipped
None.

## AI Components
None.

## Connectors
Alpaca.

## Fit
Cheapest path to a paper account with a real API. The YouTube builds in `06-youtube/SYNTHESIS.md` start here. Use for the first paper-trading leg.
