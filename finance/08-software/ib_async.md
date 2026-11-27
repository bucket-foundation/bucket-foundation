# ib_async

https://github.com/ib-api-reloaded/ib_async. License BSD-2-Clause. Stars 1,801. Last push 2026-11-26. Python. Checked 2026-11-27.

## Architecture
Asyncio rewrite of the Interactive Brokers TWS socket protocol, successor to ib_insync. `ib.py` holds the `IB` facade; `client.py` and `decoder.py` speak the wire protocol; `wrapper.py` keeps live state (positions, orders, tickers) in sync.

## Data Layer
Historical bars, real-time bars, tick-by-tick, market depth, fundamentals, news, scanners, and Flex reports (`flexreport.py`).

## Event Loop
asyncio. Sync wrappers block on the loop for notebook use. `IBC` controller (`ibcontroller.py`) restarts Gateway.

## Execution
All TWS order types: market, limit, stop, bracket, OCA, algos, combos, options and futures.

## Risk
None beyond IBKR account checks.

## Strategies Shipped
None.

## AI Components
None.

## Connectors
IBKR TWS and IB Gateway.

## Fit
Python path to IBKR for stocks, options, futures, FX and bonds in one account. Use it for the IBKR leg and for account and position reads in the alert layer.
