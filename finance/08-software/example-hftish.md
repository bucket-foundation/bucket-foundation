# example-hftish

https://github.com/alpacahq/example-hftish. License none stated. Stars 875. Last push 2023-07-25. Python. Checked 2026-11-27.

## Architecture
One script, `tick_taker.py`, with a `Quote` class and a `Position` class plus websocket handlers. Built on the legacy `alpaca_trade_api` package.

## Data Layer
Alpaca streaming quotes (`Q.<symbol>`) and trades (`T.<symbol>`). No storage.

## Event Loop
Event driven through `StreamConn` callbacks: `on_quote` updates the book top, `on_trade` decides, `on_trade_updates` reconciles fills.

## Execution
Limit orders of 100 shares at the ask or bid. The script cancels each order right after submission to imitate IOC. Paper or live set by `--base-url`.

## Risk
`Position` tracks filled and pending shares against `--quantity` (default 500, minimum 100). One trade per level change. Quote moves other than one penny are ignored.

## Strategies Shipped
`tick_taker.py`: order book imbalance. Buy at the ask when bid size exceeds 1.8 times ask size after a trade of 100 or more shares prints at the ask; sell at the bid on the mirror condition. Trades within 50 ms of a level change are skipped.

## AI Components
None.

## Connectors
Alpaca.

## Fit
Minimal reference for order book imbalance logic and fill-state bookkeeping. Latency from Python and cancel-after-submit means it demonstrates the idea only.
