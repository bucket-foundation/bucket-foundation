# RQAlpha

https://github.com/ricequant/rqalpha. License: custom; free for non-commercial use, commercial use needs a Ricequant license (GitHub reports NOASSERTION). Stars 6,899. Last push 2026-10-28. Python. Checked 2026-11-27.

## Architecture
Event-driven backtester with a mod system. Core (`rqalpha/core`) loads the strategy and dispatches events; mods add accounts, analyser, risk, scheduler, simulation and transaction cost.

## Data Layer
Bundled China A-share and futures daily bundles in HDF5; data source interface for custom feeds.

## Event Loop
`core/executor.py` publishes bar, tick, before_trading and after_trading events; `rqalpha_mod_sys_scheduler` adds daily, weekly, monthly timers.

## Execution
`rqalpha_mod_sys_simulation` matches orders against bars or ticks with slippage.

## Risk
`rqalpha_mod_sys_risk/validators`: cash, price limit, is-trading, self-trade checks before each order.

## Strategies Shipped
`rqalpha/examples/`: buy_and_hold, golden_cross, macd, IF_macd, rsi, pair_trading, turtle.

## AI Components
None.

## Connectors
None open source; Ricequant sells live connectors.

## Fit
China-market focus. The pre-trade validator pattern is worth copying.
