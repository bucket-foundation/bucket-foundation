# tiingo-python

https://github.com/hydrosquall/tiingo-python. License MIT. Stars 320. Last push 2025-12-14. Python. Checked 2026-11-27.

## Architecture
Client package `tiingo/`: `api.py` (`TiingoClient`), `restclient.py` (HTTP session), `wsclient.py` (`TiingoWebsocketClient`), `exceptions.py`. `tools/api_key_tool.py` stores a key.

## Data Layer
Tiingo REST for end-of-day prices, IEX intraday, news, bulk news, fundamentals definitions, daily metrics and statements, crypto metadata, top of book and price history. Optional pandas DataFrame output through `get_dataframe`.

## Event Loop
Websocket client with a user callback `cb_fn` for IEX, FX and crypto streams.

## Execution
None.

## Risk
None.

## Strategies Shipped
None.

## AI Components
None.

## Connectors
Tiingo API only.

## Fit
Thin data adapter. Covers fundamentals and news in one key, which most free feeds lack.
