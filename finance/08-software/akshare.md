# akshare

https://github.com/akfamily/akshare. License MIT. Stars 23,496. Last push 2026-11-25. Python. Checked 2026-11-27.

## Architecture
Library of scraping functions grouped by asset class under `akshare/`: `stock`, `fund`, `futures`, `option`, `bond`, `index`, `macro`, `fx`, `crypto`, `energy`, `spot`, `interest_rate`, `alternative`. `registry.py` plus `scripts/build_registry.py` index every public function; `llms.txt` exposes the index to agents.

## Data Layer
No store. Each function calls a public site (Eastmoney, Sina, Tencent, exchanges, central banks) through `request.py` and returns a pandas DataFrame. Bundled JS files (`cninfo.js`, `ths.js`) reproduce site token algorithms.

## Event Loop
None. Synchronous pull functions.

## Execution
None.

## Risk
None.

## Strategies Shipped
None.

## AI Components
`llms.txt` and the registry make the function catalog readable by LLM agents. A sibling repo, aktools, serves it over HTTP and MCP.

## Connectors
Eastmoney, Sina, Tencent, Shanghai and Shenzhen exchanges, CFFEX and other futures exchanges, macro modules for China, USA, UK, Japan, Germany, Canada, Australia and Switzerland.

## Fit
Widest free Chinese-market data surface in one import. Scrapers break when sites change, so each endpoint needs a freshness check before use.
