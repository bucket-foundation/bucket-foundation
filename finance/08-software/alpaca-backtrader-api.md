# alpaca-backtrader-api

https://github.com/alpacahq/alpaca-backtrader-api. License Apache-2.0. Stars 706. Last push 2026-06-23. Python. Checked 2026-11-27.

## Architecture
Adapter package for backtrader: `alpacastore.py` (REST and stream client), `alpacabroker.py` (backtrader broker interface), `alpacadata.py` (data feed). Three classes and a `sample/` folder.

## Data Layer
Alpaca REST bars plus Polygon or Alpaca streaming.

## Event Loop
Runs inside backtrader's cerebro loop.

## Execution
Broker class maps backtrader orders to Alpaca orders and fills back to notifications.

## Risk
Account cash and positions from Alpaca; no extra risk code.

## Strategies Shipped
Samples only: SMA crossover, multiple data feeds, resampling.

## AI Components
None.

## Connectors
Alpaca.

## Fit
Shows the broker and data-feed adapter split of backtrader. Depends on backtrader, stale since 2024.
