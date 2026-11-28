# cointrol

https://github.com/jkbrzt/cointrol. License MIT. Stars 1,453. Last push 2023-08-26. Python. Checked 2026-11-27.

## Architecture
Django project with three packages: `cointrol/core` (models, serializers), `cointrol/server` (REST API, SockJS realtime push) and `cointrol/trader` (Tornado worker process). A CoffeeScript Ember dashboard lives in `webapp/`.

## Data Layer
Django ORM models `Account`, `TradingSession`, `Ticker`, `Balance`, `Order`, `Transaction` and strategy profiles. Bitstamp REST responses map to model classes in `trader/bitstamp.py`.

## Event Loop
Tornado IOLoop. `app.py` runs `Monitoring`, `TickerWatcher`, `TransactionsWatcher` and `OrdersWatcher` once in sequence, then forever in parallel; each worker publishes changes to the dashboard.

## Execution
`BitstampClient` places limit buy and sell orders, cancels orders and reads balances. `Trader.work` alternates buy and sell against the last filled order.

## Risk
Profile validation asserts a minimum fee margin (buy under 99.8 percent, sell over 100.2 percent of last price). No stop loss or position cap.

## Strategies Shipped
`trader/strategies.py`: `FixedStrategy` (fixed buy and sell prices) and `RelativeStrategy` (percent offset from the last order price).

## AI Components
None.

## Connectors
Bitstamp REST API.

## Fit
Readable example of an Django plus Tornado bot with a live dashboard. Bitstamp API version is outdated.
