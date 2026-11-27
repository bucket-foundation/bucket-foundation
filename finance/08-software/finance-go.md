# finance-go

https://github.com/piquette/finance-go. License MIT. Stars 791. Last push 2023-08-07. Go 1.13+. Checked 2026-11-27.

## Architecture
One package per asset class (`quote`, `equity`, `index`, `option`, `options`, `forex`, `crypto`, `future`, `etf`, `mutualfund`, `chart`, `symbols`). Each has a `Client` over a shared `Backend` in `finance.go`, with `iter` for result iteration and `form` for query encoding.

## Data Layer
Yahoo Finance endpoints (`query1.finance.yahoo.com`), with a BATS backend constant. Structs for quotes, option chains, straddles and historical bars.

## Event Loop
None. Request and response.

## Execution
None.

## Risk
None.

## Strategies Shipped
None. Options straddle helper builds call and put pairs by strike.

## AI Components
None.

## Connectors
Yahoo Finance.

## Fit
Typed Go reader for Yahoo quotes and chart history. Yahoo changed its API access rules after 2023, so check that endpoints still answer before relying on it.
