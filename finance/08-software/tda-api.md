# tda-api

https://github.com/alexgolec/tda-api. License MIT. Stars 1,323. Last push 2024-06-16. Python. Checked 2026-11-27.

## Architecture
Package `tda/`: `auth.py` (OAuth token file, browser and manual flows), `client/` (`base.py`, `synchronous.py`, `asynchronous.py`), `orders/` (builders for equities, options and generic orders), `streaming.py`, `contrib/`, `scripts/orders_codegen.py`. The README states TD Ameritrade closed on 2024-05-10 after migration to Charles Schwab, so the API is retired.

## Data Layer
REST calls return HTTP responses. Price history is available at 1, 5, 10, 15 and 30 minute and daily bars, plus option chains and quotes. No local database.

## Event Loop
`StreamClient` runs on asyncio and dispatches handlers per feed (level one quotes, order book, time and sales, account activity). The REST client has sync and async variants.

## Execution
`place_order`, `replace_order` and `cancel_order` take specs from `orders/`: market and limit equities, single options, vertical spreads, and `first_triggers_second` or one-cancels-other chains.

## Risk
None. Order specs carry stop and limit fields only.

## Strategies Shipped
None. `examples/` holds a quote fetch, a time and sales stream and a dividend screen.

## AI Components
None.

## Connectors
TD Ameritrade REST and streaming API.

## Fit
Good reference for typed order-spec builders and a token-refresh client. The target API no longer exists; a Schwab port would reuse the order and streaming design.
