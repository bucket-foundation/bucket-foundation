# PyTrendFollow

https://github.com/chrism2671/PyTrendFollow. License MIT. Stars 474. Last push 2018-04-25. Python. Checked 2026-11-27.

## Architecture
Modules `core/` (contract, spot and currency stores, HDF store, IB connection, data feed), `data/` (provider factory with IB, Quandl and MongoDB), `trading/` (portfolio, account, rules, bootstrap, IBstate) and `config/` (instruments, portfolios, strategy template). Entry scripts: `download.py`, `scheduler.py`, `trade.sh`.

## Data Layer
Quandl and Interactive Brokers history, stored in HDF files. Panama back-adjusted futures prices with roll and carry handling.

## Event Loop
Scripts. `scheduler.py` uses the `schedule` package: sync time from config, IB reconnect and open-order refresh every 15 seconds, net liquidation print every 6 hours.

## Execution
`trading/ibstate.py` places market orders through the Interactive Brokers API and caches session orders. Positions are synced to the target portfolio daily.

## Risk
Volatility target of 12.5 percent a year (`config/strategy.py.template`), capital assumption, bootstrapped instrument and rule weights, correlation and covariance tables in `Portfolio`.

## Strategies Shipped
`trading/rules.py`: EWMAC at four speeds, carry (spot, next, prev), breakout, mean reversion, buy and hold, sell and hold, weather rule, open-close.

## AI Components
None.

## Connectors
Interactive Brokers, Quandl, MongoDB.

## Fit
Compact reference for Carver-style systematic futures with volatility targeting and bootstrapped weights. Dormant since 2018 and built on the old `ib.ext` API.
