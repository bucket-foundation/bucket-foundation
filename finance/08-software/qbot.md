# Qbot

https://github.com/UFund-Me/Qbot. License MIT. Stars 18,875. Last push 2026-03-11. Python and notebooks. Checked 2026-11-27.

## Architecture
Desktop research platform with a wxPython GUI (`qbot/gui`), backtest engines (backtrader, vnpy fork), `pytrader/` web app, `pyfunds/` fund tools, `pyfutures/`. China-market focus with easytrader and easyquotation for A-shares.

## Data Layer
Tushare, Baostock, Eastmoney and easyquotation for China equities and funds; Binance for crypto.

## Event Loop
backtrader or vnpy event loops depending on the strategy.

## Execution
easytrader drives China broker clients; vnpy gateways.

## Risk
Strategy-level only.

## Strategies Shipped
`qbot/strategies/`: adx, arbr, bigger_than_ema, boll, k_lines, lstm, multi_strategy, rl, sma_cross, ssa, undervalued_stock_picking. `pytrader/strategies/`: CCI, StochRSI, aroon, k-line, lgb, monte_carlo, multi_factor, q-learning, rsi_departure, signal, svm. `pytrader/backtest_strategies/`: BOLL, CCI, MACD, RSI.

## AI Components
LSTM, LightGBM, SVM, Q-learning and RL strategies; Qlib workflow example.

## Connectors
China brokers through easytrader; Binance.

## Fit
Large star count, mostly China-market demos. Low fit outside A-shares.
