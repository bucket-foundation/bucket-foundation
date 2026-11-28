# yfinance

https://github.com/ranaroussi/yfinance · Apache-2.0 · 26,019 stars · last push 2026-11-26 · Python · checked 2026-11-27

## Architecture
Unofficial client for Yahoo Finance web endpoints. `ticker.py`, `tickers.py`, `multi.py` (`download`), `base.py`, `scrapers/` (history, fundamentals, analysis, holders, funds, quote), `screener/`, `search.py`, `lookup.py`, `live.py` (websocket), `calendars.py`, `cache.py`, `_http.py`.

## Data Layer
OHLCV history with dividends and splits, price repair logic in `scrapers/history.py`, financial statements, analyst estimates, holders, options chains, fund data, earnings calendars, screener queries. Local SQLite caches for timezones and cookies. Live quotes over `wss://streamer.finance.yahoo.com` decoded from protobuf (`pricing.proto`).

## Event Loop
None. `live.py` `WebSocket` and `AsyncWebSocket` push quote messages to a callback.

## Execution
None.

## Risk
Data risk: unofficial, rate limited, terms forbid commercial use, schema breaks after Yahoo changes.

## Strategies Shipped
None.

## AI Components
None.

## Connectors
Yahoo Finance only.

## Fit
Free daily bars and fundamentals for research and end-of-day alerts. Replace with a licensed feed before any live order path.
