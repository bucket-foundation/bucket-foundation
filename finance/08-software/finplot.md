# finplot

https://github.com/highfestiva/finplot. License MIT. Stars 1,188. Last push 2026-09-24. Python. Checked 2026-11-27.

## Architecture
Charting library. `finplot/__init__.py` (3,192 lines) holds `FinWindow`, `FinViewBox`, `FinCrossHair`, `PandasDataSource` and item classes (`CandlestickItem`, `HeatmapItem`, `HorizontalTimeVolumeItem`, `ScatterLabelItem`) on top of pyqtgraph and PyQt6. `live.py` wraps plot updates; `pdplot.py` adds a pandas `.plot` hook.

## Data Layer
Pandas DataFrames wrapped by `PandasDataSource`, with an epoch-aware x axis. No storage and no feed. Examples pull from Bitfinex, BitMEX websockets and Yahoo.

## Event Loop
Qt event loop. `timer_callback` drives refresh; `live()` and `refresh()` redraw items on new rows.

## Execution
None.

## Risk
None.

## Strategies Shipped
None. `examples/` has analysis demos: `volume-profile.py`, `overlay-correlate.py`, `renko-dark-mode.py`, `heatmap.py`, `snp500.py`, `bitmex-ws.py`.

## AI Components
None.

## Connectors
Examples call Bitfinex REST, BitMEX websocket and Yahoo data. The library itself takes any DataFrame.

## Fit
Fast candlestick, volume profile and order book heatmap viewer for backtest review. Useful as the plotting layer beside a backtester; it has no trading logic.
