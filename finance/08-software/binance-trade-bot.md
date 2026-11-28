# binance-trade-bot

https://github.com/ccxt/binance-trade-bot. License GPL-3.0. Stars 8,841. Last push 2025-03-12. Python. Checked 2026-11-27.

## Architecture
`binance_trade_bot/`: `crypto_trading.py` entry, `auto_trader.py` base, `strategies/` (default, multiple_coins), `binance_api_manager.py`, `binance_stream_manager.py`, SQLite `database.py`, `scheduler.py`, `notifications.py` (Apprise), `backtest.py`.

## Data Layer
Binance prices over websocket; coin pair ratio history in SQLite.

## Event Loop
Scheduler calls `scout` every few seconds.

## Execution
Market-style jumps from the held coin to a target coin through the bridge coin (USDT).

## Risk
None beyond configured scout margin.

## Strategies Shipped
`default_strategy.py`: hold one coin, jump to another when its price ratio vs the held coin beats the stored ratio by more than fees plus margin. `multiple_coins_strategy.py`: same scouting across all held coins.

## AI Components
None.

## Connectors
Binance.

## Fit
Historical interest only; the ratio-jump idea is a crude relative-value rule.
