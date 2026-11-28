# ib_insync

https://github.com/erdewit/ib_insync. License BSD-2-Clause. Stars 3,277. Last push 2024-03-14. Python. Checked 2026-11-27.

## Architecture
Package `ib_insync/`: `client.py` (socket protocol), `decoder.py`, `wrapper.py` (state and callbacks), `ib.py` (the `IB` facade, 2,249 lines), `contract.py`, `order.py`, `objects.py`, `ticker.py`, `flexreport.py`, `ibcontroller.py` (`IBC` and `Watchdog`) and `util.py` with the event-loop helpers.

## Data Layer
No store. `Wrapper` keeps live state for orders, trades, positions, tickers and account values; `flexreport.py` parses IB Flex statements.

## Event Loop
asyncio with a synchronous face: blocking calls run the loop through `util.run`, async twins end in `Async`. Events use the `eventkit` library.

## Execution
`IB.placeOrder(contract, order)` returns a `Trade` that updates on fills; `cancelOrder`, bracket and what-if helpers are included.

## Risk
None; relies on account-level limits at the broker. `Watchdog` restarts a crashed gateway.

## Strategies Shipped
None; `examples/` has Qt and Tk ticker tables.

## AI Components
None.

## Connectors
Interactive Brokers TWS and Gateway, IBC controller.

## Fit
Standard Python layer for Interactive Brokers. The author archived the project in 2024 and the maintained fork is ib_async.
