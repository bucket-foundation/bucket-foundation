# Backtrader

https://github.com/mementum/backtrader · GPL-3.0 · 23,819 stars · last push 2024-08-19 · Python · checked 2026-11-27

## Architecture
Event-driven backtest and live library. `backtrader/cerebro.py` wires data feeds, strategies, brokers, sizers, analyzers and observers. Everything is a "line" series (`linebuffer.py`, `lineiterator.py`) with metaclass parameter handling (`metabase.py`).

## Data Layer
Feeds in `backtrader/feeds/`: CSV variants, pandas, Yahoo, Quandl, InfluxDB, Interactive Brokers, Oanda, Visual Chart, Sierra Chart, MT4 CSV, futures rollover. Resampling and replay filters (`resamplerfilter.py`) for multi-timeframe.

## Event Loop
Bar by bar: `prenext` during warmup, then `next` per bar. Orders placed on bar t fill on bar t+1 open unless cheat-on-open or cheat-on-close is set. `runonce` vectorized indicator precompute for speed.

## Execution
`backtrader/brokers/bbroker.py` simulator with market, limit, stop, stop-limit, stop-trail, OCO and bracket orders, slippage, volume filling (`fillers.py`), commission schemes (`comminfo.py`). Live brokers: IB, Oanda, Visual Chart.

## Risk
Sizers in `backtrader/sizers/` (fixed, percent). Stop orders and brackets. Analyzers for drawdown, Sharpe, SQN, VWR, time return, PyFolio export.

## Strategies Shipped
- `backtrader/strategies/sma_crossover.py`: long when fast SMA crosses above slow SMA, exit on cross below.
- `samples/btfd/btfd.py`: buy the dip after a one-day fall beyond a threshold, hold a fixed number of bars.
- `samples/kselrsi/ksignal.py`: RSI signal strategy, long under 35, exit at 50.
- `samples/macd-settings/macd-settings.py`: MACD cross above signal with falling SMA filter, ATR trailing stop.
- `samples/gold-vs-sp500/gold-vs-sp500.py`: MA crossover with Pearson correlation of gold and S&P 500.
- `samples/signals-strategy/`, `samples/sigsmacross/`: SMA cross via signal API.
- `samples/pinkfish-challenge/`: new high breakout with day-step replay.
- `samples/strategy-selection/`, `samples/oco/`, `samples/bracket/`, `samples/stoptrail/`, `samples/pivot-point/`, `samples/psar/`, `samples/renko/`: mechanics demos.

## AI Components
None.

## Connectors
Interactive Brokers (`stores/ibstore.py`, `brokers/ibbroker.py`, uses `IbPy`), Oanda v1 (`stores/oandastore.py`), Visual Chart.

## Fit
Mature reference for event-driven design and order types. Unmaintained since 2024 and the IB and Oanda stores target old APIs, so use it for study or simple daily backtests only.
