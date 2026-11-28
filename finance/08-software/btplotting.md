# btplotting

https://github.com/happydasch/btplotting. License GPL-3.0. Stars 385. Last push 2025-05-04. Python. Checked 2026-11-27.

## Architecture
Bokeh plotting add-on for Backtrader. `app.py` (`BacktraderPlotting`), `figure.py`, `tabs/` and `analyzer_tables/` (annual return, Calmar, drawdown, Sharpe, SQN, VWR, trade analyzers, transactions), `schemes/` (blackly, tradimo), `live/` (`LiveClient`, data handler), `analyzers/plot.py` (`LivePlotAnalyzer`), `optbrowser.py` for optimization results.

## Data Layer
Reads Backtrader strategy data and analyzer output. `feeds/fakefeed.py` supplies a test feed.

## Event Loop
Bokeh server callbacks. In live mode `LivePlotAnalyzer` pushes bar updates from a running Cerebro to the browser client.

## Execution
None.

## Risk
Displays performance and risk analyzers. Computes none.

## Strategies Shipped
None.

## AI Components
None.

## Connectors
Backtrader only.

## Fit
Visual layer for Backtrader runs, with live plotting and an optimization browser. Pairs with any Backtrader strategy set.
Tabs show performance tables, a trade log and an analyzer panel; the optimization browser compares parameter runs side by side.
