# findatapy

https://github.com/cuemacro/findatapy. License Apache-2.0. Stars 2,152. Last push 2026-07-02. Python. Checked 2026-11-27.

## Architecture
`findatapy/market/` has `Market` and `MarketDataGenerator` that take a `MarketDataRequest` and dispatch to vendor classes (`datavendorweb.py`, `datavendorbbg.py`, `datavendorfred.py`, `datavendorcrypto.py`, `datavendordatabento.py`); `ioengine.py` handles storage; `timeseries/` has calculations, filters, calendar, return stats and data quality; `util/configmanager.py` loads ticker mappings.

## Data Layer
Unified request with tickers, fields, frequency and vendor; results are pandas frames. IO engine reads and writes HDF5, Parquet, ArcticDB, Redis and S3, with a cache layer and split-download helpers.

## Event Loop
None; synchronous or multiprocessing calls.

## Execution
None.

## Risk
None. `dataquality.py` checks series gaps and outliers.

## Strategies Shipped
None.

## AI Components
None.

## Connectors
Bloomberg, Eikon, Quandl, Yahoo, Dukascopy, FXCM, Alpha Vantage, FRED, ONS, BoE, Databento, crypto exchanges, flat files.

## Fit
Vendor-neutral market data loader with a mature caching story. Candidate for the data acquisition layer where keys exist; free vendors in it have drifted.
