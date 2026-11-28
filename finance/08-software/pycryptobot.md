# pycryptobot

https://github.com/whittlem/pycryptobot. License Apache-2.0. Stars 2,061. Last push 2026-03-26. Python. Checked 2026-11-27.

## Architecture
`pycryptobot.py` main loop; `models/` holds `Trading.py`, `TradingAccount.py`, `Strategy.py`, `AppState.py`, exchange wrappers; `telegram_bot.py`, `webgui.py`, `scanner.py` and `screener.py`.

## Data Layer
Exchange candles via Binance, Coinbase Pro, Kucoin APIs, indicators computed with pandas.

## Event Loop
Timed loop per granularity with a state object.

## Execution
Market buys and sells with optional limit; simulation mode.

## Risk
Stop loss, trailing stop, max drawdown and buy-last-sell-protection flags.

## Strategies Shipped
`Strategy.py` signals: EMA 12/26 cross, MACD, Bollinger bands, candlestick patterns, ADX, OBV.

## AI Components
None.

## Connectors
Binance, Coinbase, Kucoin.

## Fit
Popular config-driven bot; code is long and mixed but covers telegram and web UI.
