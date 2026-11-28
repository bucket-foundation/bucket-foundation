# stock-pattern

https://github.com/BennyThadikaran/stock-pattern. License GPL-3.0. Stars 420. Last push 2025-12-02. Python. Checked 2026-11-27.

## Architecture
CLI scanner. `src/init.py` (interactive and command-line scan with a process pool), `src/utils.py` (pattern detectors and geometry), `src/Plotter.py` (charts), `src/backtest.py`, `src/loaders/` (`AbstractLoader`, `EODFileLoader`, `IEODFileLoader`), `src/setup-config.py`.

## Data Layer
CSV files read by pluggable loaders: end-of-day and higher timeframes (weekly and monthly resampled) or intraday with resampling. The user supplies the data.

## Event Loop
None. Batch scan across symbols with `concurrent.futures`.

## Execution
None.

## Risk
Uses ATR (`get_atr`, window 15) for pattern tolerances. No position risk.

## Strategies Shipped
`src/utils.py` detectors: bullish and bearish flags, VCP, double top and bottom, triangles, head and shoulders and its reverse, uptrend and downtrend lines, bullish and bearish ABCD. `backtest.py` runs scans through history.

## AI Components
None.

## Connectors
None. CSV loaders only.

## Fit
Rule-based chart pattern scanner for a watchlist. Pair with a data pipeline that writes the CSVs.
