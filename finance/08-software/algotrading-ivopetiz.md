# Crypto AlgoTrading Framework

https://github.com/ivopetiz/algotrading. License MIT. Stars 1,722. Last push 2026-01-07. Python. Checked 2026-11-27.

## Architecture
`cryptoalgotrading/` has `cryptoalgotrading.py` (bot runner), `entry.py` and `exit.py` (rule sets), `riskmanagement.py`, `var.py`, `finance.py`, `lib_bittrex.py`. Modes: realtime, tick-by-tick, backtest.

## Data Layer
Bittrex API and local price history folders (`hist-10m`, `hist-10s`).

## Event Loop
Polling loop over tick snapshots.

## Execution
Bittrex order calls.

## Risk
Stop loss, trailing stop loss, value-at-risk helper.

## Strategies Shipped
Entry and exit rule functions in `entry.py` and `exit.py` (moving averages, RSI, volume spikes).

## AI Components
None.

## Connectors
Bittrex only, which has closed.

## Fit
Dated but clear separation of entry, exit and risk modules.
