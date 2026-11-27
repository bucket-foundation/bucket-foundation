# peregrine

https://github.com/wardbradt/peregrine. License MIT. Stars 1,249. Last push 2021-06-28. Python. Checked 2026-11-27.

## Architecture
Package `peregrinearb/`: `async_build_markets.py`, `async_find_opportunities.py`, `bellmannx.py` (Bellman-Ford on networkx graphs), `bellman_multi_graph.py`, `multi_graph_builder.py`, `wss_graphs.py`, `utils/`. `cythonperegrine/` holds Cython versions of the opportunity finder. `bot_implementation/` has two example traders.

## Data Layer
CCXT async exchange clients fetch tickers and order books into a `networkx` directed graph per exchange. No database.

## Event Loop
asyncio coroutines per exchange. `wss_graphs.py` builds graphs from websocket streams.

## Execution
`bot_implementation/one_exchange.py` walks each negative cycle and sends market orders through `exchange.create_order`; `multi_exchange_long_short.py` buys on one exchange, sells on another and covers. Both files warn that they are proof of concept.

## Risk
None. The docstring lists stale quotes and ignored order size as open issues.

## Strategies Shipped
Triangular and longer cycle arbitrage on one exchange via negative cycles with log-weighted edges and fees; cross-exchange spread between two venues.

## AI Components
None.

## Connectors
CCXT, 131 exchanges per the README.

## Fit
Cleanest open example of Bellman-Ford cycle detection over an exchange graph. Needs depth-aware sizing before any live use.
