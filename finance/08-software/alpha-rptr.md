# alpha-rptr

https://github.com/TheFourGreatErrors/alpha-rptr. License MIT. Stars 711. Last push 2026-06-19. Python. Checked 2026-11-27.

## Architecture
`main.py` starts a `Bot` subclass from `src/strategies/`. `src/bot.py` owns the run loop, `src/exchange/` holds live, stub (paper) and backtest exchanges so one strategy file runs in all three modes. `src/gmail_sub.py` takes TradingView alert emails.

## Data Layer
Exchange websocket klines resampled to the strategy timeframes; backtest reads exchange history.

## Event Loop
Callback model: `strategy(action, open, close, high, low, volume)` fires on each bar close; order and position callbacks also exist.

## Execution
Market, limit and chaser orders on Binance Futures, Bybit and BitMEX through exchange classes.

## Risk
Position lot sizing in the exchange object; hyperopt search spaces per strategy. No portfolio stop.

## Strategies Shipped
`SMA.py` crossover, `SAR.py`, `Rci.py`, `Doten.py` (Donchian), `SupertrendStrat.py`, `MACDLongOnly.py`, `OCC.py`, `TV.py` (trades TradingView alerts).

## AI Components
None.

## Connectors
Binance Futures, Bybit, BitMEX; FTX code is legacy.

## Fit
Clean example of one strategy class across backtest, paper and live. Exchange list is dated.
