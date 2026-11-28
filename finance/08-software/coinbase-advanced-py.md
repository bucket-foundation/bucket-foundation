# Coinbase Advanced API Python SDK

https://github.com/coinbase/coinbase-advanced-py · Apache-2.0 · 365 stars · last push 2026-10-19 · Python · checked 2026-11-27

## Architecture
Official SDK. `coinbase/rest/` splits the REST client into mixins per area (`accounts.py`, `orders.py`, `products.py`, `market_data.py`, `futures.py`, `perpetuals.py`, `portfolios.py`, `convert.py`, `fees.py`, `payments.py`, `data_api.py`, `public.py`). `coinbase/websocket/` holds `WSClient` and `WSUserClient`. `coinbase/jwt_generator.py` signs CDP API keys. A `coinbase/deribit/` package adds REST and websocket clients for Deribit.

## Data Layer
Candles, products, best bid and ask, order book, market trades via REST. Websocket channels: ticker, level2, market trades, candles, heartbeats, status, user, futures balance summary.

## Event Loop
None; the caller drives. Websocket client runs on a background thread with retry and callback `on_message`.

## Execution
`orders.py` exposes 64 functions: market, limit IOC, GTC, GTD, FOK, stop-limit, bracket (trigger bracket), each with buy and sell variants and `preview_*` calls that return estimated fills without placing. Edit and cancel orders, close position.

## Risk
None beyond `preview_*` endpoints and client order ids for idempotency.

## Strategies Shipped
None.

## AI Components
None.

## Connectors
Coinbase Advanced Trade spot, US futures, INTX perpetuals; Deribit.

## Fit
Use for a US-regulated crypto spot and futures adapter. Preview orders fit a notify-first flow: alert the founder with a previewed fill, place on approval.
