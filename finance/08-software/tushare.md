# tushare

https://github.com/waditu/tushare. License BSD-3-Clause. Stars 15,512. Last push 2024-03-13. Python. Checked 2026-11-27.

## Architecture
Package `tushare/` with modules by domain: `stock` (trading, fundamental, reference, billboard, macro, indicator, trendline), `futures`, `fund`, `bond`, `coins`, `internet`, `pro` (token client for the paid Pro API) and `trader`.

## Data Layer
No store. Legacy functions scrape Sina, Eastmoney and exchange pages into DataFrames. `pro/client.py` posts to the Tushare Pro HTTP API with a token and `pro/data_pro.py` wraps the calls.

## Event Loop
None. A heartbeat thread keeps the broker session alive in `trader.py`.

## Execution
`trader/trader.py` `TraderAPI` logs into a broker web portal (CSC) and exposes `buy`, `sell`, `position`, `entrust_list`, `deal_list`, `cancel`.

## Risk
None.

## Strategies Shipped
None. `stock/trendline.py` and `stock/indictor.py` hold indicator helpers only.

## AI Components
None.

## Connectors
Tushare Pro API, Sina, Eastmoney, exchange sites, one broker portal.

## Fit
Historic A-share data client. Development has been idle since 2024 and the free scrapers are the stale part; the Pro API is the maintained route.
