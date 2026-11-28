# support_resistance

https://github.com/day0market/support_resistance. License not stated. Stars 477. Last push 2023-07-06. Python. Checked 2026-11-27.

## Architecture
Small package `pricelevels/`. `_abstract.py` defines `BaseLevelFinder` (fit, levels) and `BaseZigZagLevels`. `cluster.py` holds `RawPriceClusterLevels` and `ZigZagClusterLevels`. `scoring/touch_scorer.py` ranks levels. `visualization/` plots levels on candlesticks.

## Data Layer
Takes a pandas OHLC frame in `fit`. No storage, no feed.

## Event Loop
None. Batch calls on a DataFrame.

## Execution
None.

## Risk
None.

## Strategies Shipped
None. It computes support and resistance levels: rolling-window peak detection or zig-zag pivots, then agglomerative clustering (scikit-learn) merges nearby prices into levels. A touch scorer counts how many times price tested each level.

## AI Components
Unsupervised clustering only (`AgglomerativeClustering`).

## Connectors
None.

## Fit
Indicator utility for chart-level signals. Pair with any backtester. Tests cover clustering and scoring; last push is 2023.
Inputs are a pandas OHLC frame with merge distance given as an absolute value or a percent. Zig-zag mode adds a peak percent delta and a minimum bar gap between peaks.
