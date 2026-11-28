# paperbroker

https://github.com/philipodonnell/paperbroker. License MIT. Stars 282. Last push 2018-04-08. Python. Checked 2026-11-27.

## Architecture
Package `paperbroker/`: `PaperBroker.py` facade, `accounts.py`, `orders.py`, `positions.py`, `assets.py`, `estimators.py`, `logic/` (fill, margin, validation, expiry), `adapters/` (accounts, markets, quotes). `server.py` exposes a small HTTP API.

## Data Layer
Pluggable `QuoteAdapter` (Google Finance adapter included, CSV test adapter) and `AccountAdapter` (local file system).

## Event Loop
None. Synchronous calls; `server.py` routes for quotes, option chains, expirations and accounts.

## Execution
`buy_to_open`, `sell_to_open`, `buy_to_close`, `sell_to_close`, `enter_order`, `simulate_order`. `fill_order` fills against quotes through an `Estimator`.

## Risk
`maintenance_margin.py` computes margin after grouping legs into basic strategies; `validate_account.py` checks accounts; `close_expired_options.py` settles expiries.

## Strategies Shipped
None.

## AI Components
None.

## Connectors
Google Finance quotes, which no longer serve this API.

## Fit
Model for an options paper broker with margin by strategy grouping. Quote adapter needs replacing before use.
