# FinanceDataReader

https://github.com/FinanceData/FinanceDataReader. License MIT. Stars 1,581. Last push 2026-05-13. Python. Checked 2026-11-27.

## Architecture
Package `src/FinanceDataReader/` with one subpackage per source (`krx`, `naver`, `yahoo`, `nasdaq`, `wikipedia`, `investing`, `fred`, `ecos`) and a facade in `data.py` exposing `DataReader`, `SnapDataReader`, `StockListing` and `EtfListing`. `chart/` draws candle plots; `cli.py` provides `fdr price`, `fdr snap` and `fdr listing`.

## Data Layer
Pandas DataFrames from scraped or public endpoints. Symbols carry a source prefix such as `FRED:DEXKOUS` or `KRX:KOSPI`. Listing caches (`KrxStockListingCache`) avoid repeat downloads.

## Event Loop
None. Synchronous pulls.

## Execution
None.

## Risk
None.

## Strategies Shipped
None.

## AI Components
None.

## Connectors
KRX, Naver Finance, Yahoo, NASDAQ listings, Wikipedia index lists, Investing.com, FRED and the Bank of Korea ECOS API.

## Fit
Best single package for Korean equities and Bank of Korea macro series, with global indexes and FRED alongside.
