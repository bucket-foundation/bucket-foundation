# nsetools

https://github.com/vsjha18/nsetools. License MIT. Stars 910. Last push 2025-03-18. Python. Checked 2026-11-27.

## Architecture
Single package `src/nsetools/`: `nse.py` (class `Nse`), `urls.py`, `downloader.py`, `cleaners.py`, `bases.py`, `datemgr.py`, `ua.py`, `errors.py` and `utils.py`. `exp/` holds scratch experiments.

## Data Layer
HTTP calls to the National Stock Exchange of India public web endpoints, with a session that refreshes on an interval (default 120 s) and browser-like headers. Responses are cleaned into dicts and lists.

## Event Loop
None. Polling by the caller.

## Execution
None.

## Risk
None.

## Strategies Shipped
None.

## AI Components
None.

## Connectors
NSE India: `get_quote`, `get_stock_codes`, `is_valid_code`, `get_index_quote`, `get_index_list`, `get_all_index_quote`, `get_top_gainers`, `get_top_losers`, `get_advances_declines`, `get_stocks_in_index`, `get_52_week_high`, `get_52_week_low` and `get_future_quote`.

## Fit
Light quote and index screen for Indian equities. The endpoints are unofficial and NSE changes them, so expect breakage. Fine for dashboards and daily screens.
