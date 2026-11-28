# yahooquery

https://github.com/dpguthrie/yahooquery. License MIT. Stars 921. Last push 2025-05-15. Python. Checked 2026-11-27.

## Architecture
Package `yahooquery/`. `base.py` has the shared `_YahooFinance` class; `ticker.py` (`Ticker`) exposes about 78 methods and properties; `screener.py` (`Screener`), `research.py` (`Research`) and `misc.py` (search, currencies, exchanges, market summary, trending) cover the rest. `session_management.py` handles cookies and crumb, and `headless.py` fetches them through a browser when needed.

## Data Layer
Unofficial Yahoo Finance JSON endpoints, batched across many symbols per request and combined with pandas. Quote summary modules (asset profile, earnings, financial data, ESG scores, calendar events) return frames or dicts. Async and threaded fetch options for large symbol lists.

## Event Loop
None.

## Execution
None.

## Risk
None.

## Strategies Shipped
None.

## AI Components
None.

## Connectors
Yahoo Finance: prices, options chains, fundamentals, holders, recommendations, news and screeners. Login support for premium and portfolio endpoints.

## Fit
Fast bulk fundamentals and price pulls. Yahoo changes its endpoints without notice and its terms restrict commercial use, so cache results and keep a second source.
