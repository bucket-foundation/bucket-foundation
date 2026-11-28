# Quantdom

https://github.com/constverum/Quantdom. License Apache-2.0. Stars 777. Last push 2022-07-06. Python. Checked 2026-11-27.

## Architecture
Package `quantdom/` with `lib/` (`base`, `strategy`, `portfolio`, `performance`, `charts`, `loaders`, `tables`) and a PyQt5 plus pyqtgraph GUI in `ui.py` and `app.py`. Strategies subclass `AbstractStrategy` with `init` and `handle`.

## Data Layer
`QuotesLoader` subclasses fetch Yahoo and Google quotes, with a local disk cache keyed by symbol, timeframe and dates. Quotes live in numpy recarrays (`BaseQuotes`).

## Event Loop
Bar-by-bar loop over quotes calling `handle(quote)`. Not vectorized and not live.

## Execution
Simulated. `Order.open` and `Order.close` create positions at the bar open. `Portfolio.initial_balance` sets capital.

## Risk
None.

## Strategies Shipped
`examples/simple_strategies.py` has `ThreeBarStrategy`: opens a position after a run of consecutive higher or lower bars and flips on the opposite signal.

## AI Components
None.

## Connectors
Yahoo Finance and Google Finance loaders. The Google loader is dead.

## Fit
Small GUI backtester with chart output and a performance table. Last push 2022 and a retired data source limit it to a teaching tool.
