# Crypto-Signal

https://github.com/CryptoSignal/Crypto-Signal. License MIT. Stars 5,667. Last push 2024-07-07. Python. Checked 2026-11-27.

## Architecture
Single process in `app/`: `app.py` entry, `conf.py` YAML config, `behaviour.py` loop body, `analysis.py` strategy analyzer, `exchange.py` ccxt wrapper, `notification.py` fan-out, `outputs.py` console tables. Docker compose files ship with it.

## Data Layer
Pulls OHLCV through ccxt per market pair and time unit with three-attempt retry on network errors. No database; results live in memory per cycle.

## Event Loop
Timed polling: each cycle fetches candles for every configured pair, runs analyzers, prints results and notifies on threshold changes.

## Execution
None. Signals only.

## Risk
None.

## Strategies Shipped
Indicators `rsi`, `macd`, `mfi`, `obv`, `stoch_rsi`, `ichimoku`, `momentum`; informants `sma`, `ema`, `bollinger_bands`, `vwap`, `ohlcv`; `crossover.py` compares two indicator keys. Thresholds set hot and cold labels per pair.

## AI Components
None.

## Connectors
ccxt exchanges; Telegram, Slack, Discord, Gmail, Twilio, webhook and stdout notifiers.

## Fit
Template for a signal-alert bot with a clean analyzer and notifier split. The maintainer pushed last in 2024.
