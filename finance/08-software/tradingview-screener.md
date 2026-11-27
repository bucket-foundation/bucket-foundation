# TradingView-Screener

https://github.com/shner-elmo/TradingView-Screener. License MIT. Stars 1,374. Last push 2026-11-26. Python. Checked 2026-11-27.

## Architecture
Small client library in `src/tradingview_screener/`: `query.py` (the `Query` builder), `column.py` (`Column` operators), `screeners.py` (preset queries per asset class), `models.py` (typed dicts), `util.py`. Tests cover query building and presets.

## Data Layer
Posts a JSON query to `scanner.tradingview.com/{market}/scan` with `requests` and returns a pandas DataFrame plus a total row count. No local storage.

## Event Loop
None. Each call is one synchronous request; polling is left to the caller.

## Execution
None. Read-only screening data.

## Risk
None.

## Strategies Shipped
None. `screeners.py` ships preset queries for `stocks`, `coin`, `crypto`, `crypto_dex`, `forex`, `futures`, `bond`, `cfd` and `options(underlying)`. Filters use `And` and `Or` chaining plus `where`, `order_by`, `limit`, `offset`, `set_markets`, `set_tickers` and `set_index`.

## AI Components
None.

## Connectors
TradingView scanner endpoint, undocumented and unofficial.

## Fit
Cheap cross-asset universe filter for candidate lists: any of the 3,000 plus fields the README lists can be selected and sorted in one call. The endpoint is unofficial, so it can change without notice.
