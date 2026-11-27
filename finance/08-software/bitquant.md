# bitquant

https://github.com/51bitquant/bitquant. License MIT. Stars 1,165. Last push 2025-04-10. Python. Checked 2026-11-27.

## Architecture
Course code collection. Folders: `backtest/backtester` (`Broker`, `BaseStrategy`, `ArrayManager`, `BarData`), `binance_api`, `huobi_api`, `bybit`, `ccxt_future`, `ccxt_study`, `crawl_exchanges_datas`, `technical_indicators`, `weixinbot`, `pandas_basic`, `python_abc`.

## Data Layer
CSV candles (`bitmex_btc_usd_1min_data.csv`) loaded with pandas. Crawler scripts download klines from exchanges.

## Event Loop
Backtest loops bars in order and calls `next_bar`. Exchange scripts use polling or websockets per exchange.

## Execution
`Broker` simulates fills with commission 0.2%, slippage 0.05%, leverage and a 15% minimum margin rate for liquidation. Live orders go through hand-written REST clients such as `binance_api/binance.py`.

## Risk
Margin-rate liquidation check in the backtest broker. No live risk module.

## Strategies Shipped
`backtest/demo_strategy.py`: moving-average parameter template (long 110, short 70) with a placeholder signal; the broker has a grid `optimize_strategy`.

## AI Components
None.

## Connectors
Binance, Huobi, Bybit, BitMEX, CCXT, WeChat order bot.

## Fit
Teaching code for Chinese-language crypto quant courses. The small bar-based backtester is readable; the rest is tutorial scripts.
