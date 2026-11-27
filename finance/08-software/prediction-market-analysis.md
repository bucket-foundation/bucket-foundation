# prediction-market-analysis

https://github.com/Jon-Becker/prediction-market-analysis. License MIT. Stars 3,965. Last push 2026-10-29. Python. Checked 2026-11-27.

## Architecture
Indexers plus analysis scripts. `src/indexers/kalshi` pulls markets and trades from the Kalshi API; `src/indexers/polymarket` reads trades from Polygon chain blocks and FPMM contracts. `src/analysis/` holds one script per chart.

## Data Layer
Largest public Kalshi and Polymarket trade dataset, stored as Parquet through `common/storage.py`.

## Event Loop
Batch indexers.

## Execution
None.

## Risk
None.

## Strategies Shipped
None as trading code. Analyses: win rate by price, calibration deviation over time, longshot volume share, maker vs taker returns by category and direction, EV of YES vs NO, mispricing by price, returns by hour, VWAP by hour, trade size by role.

## AI Components
None.

## Connectors
Kalshi API, Polygon RPC for Polymarket.

## Fit
Evidence base for prediction-market edges: favorite-longshot bias and maker vs taker returns. Feed its findings into the strategy catalog and its dataset into backtests.
