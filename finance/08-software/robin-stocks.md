# Robin Stocks

https://github.com/jmfernandes/robin_stocks. License MIT. Stars 2,131. Last push 2026-02-11. Python. Checked 2026-11-27.

## Architecture
Three client modules under `robin_stocks/`: `robinhood`, `gemini`, `tda`. Each wraps REST endpoints in function calls (login, quotes, orders, options chains, crypto).

## Data Layer
Quote, fundamentals, historicals and options data through Robinhood endpoints.

## Event Loop
None; synchronous calls.

## Execution
Market, limit, stop and options orders; crypto orders.

## Risk
None.

## Strategies Shipped
None.

## AI Components
None.

## Connectors
Robinhood, Gemini, TD Ameritrade (closed).

## Fit
Unofficial Robinhood client. Terms-of-service risk; use Alpaca or IBKR for production.
