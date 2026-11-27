# binance_grid_trader

https://github.com/51bitquant/binance_grid_trader. License MIT. Stars 997. Last push 2026-06-07. Python. Checked 2026-11-27.

## Architecture
A trimmed vn.py layout in `gridtrader/`: `event/engine.py` (`EventEngine`), `trader/engine.py` (CTA-style strategy engine), `trader/gateway.py`, `trader/object.py` and `trader/utility.py`. Strategies sit in `trader/strategies/`: `spot_grid_strategy.py`, `futures_grid_strategy.py`, `futures_grid_long_short_strategy.py`, with `template.py` as base. Entry points `main.py` (Qt UI), `main_spot_script.py` and `main_futures_script.py`.

## Data Layer
Binance REST and websocket clients in `gridtrader/api`. Strategy parameters in `grid_strategy_setting.json`; live grid state saved to `grid_strategy_data.json`.

## Event Loop
Event-driven. A threaded `EventEngine` dispatches tick, order, trade and timer events to strategy callbacks (`on_tick`, `on_order`, `on_trade`, `process_timer`).

## Execution
Gateways for Binance spot and USDT futures place limit orders at grid levels and cancel the farthest order when open orders exceed `max_open_orders`. On a fill the strategy places the opposite-side order one grid step away.

## Risk
Price range bounds (`upper_price`, `bottom_price`) stop the strategy outside the range, with an option to close the position on stop. Cap on open orders per side. No account-level loss limit.

## Strategies Shipped
Spot grid, futures long grid, and futures long-short grid.

## AI Components
None.

## Connectors
Binance spot and Binance USDT-margined futures.

## Fit
Small readable grid bot. Grids earn in ranges and carry inventory loss when price trends out of range, and the repo's own docstring warns of crypto risk. Use as a pattern for gateway plus strategy template separation.
