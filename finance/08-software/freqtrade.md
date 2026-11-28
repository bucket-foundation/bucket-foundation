# Freqtrade

https://github.com/freqtrade/freqtrade · GPL-3.0 · 57,326 stars · last push 2026-11-27 · Python · checked 2026-11-27

## Architecture
Single-process crypto bot. `freqtrade/freqtradebot.py` owns the trade lifecycle; `freqtrade/worker.py` runs it in a throttled loop. Strategies subclass `IStrategy` in `freqtrade/strategy/interface.py` and fill three pandas hooks: `populate_indicators`, `populate_entry_trend`, `populate_exit_trend`. Backtest, hyperopt and lookahead analysis live in `freqtrade/optimize/`.

## Data Layer
`freqtrade/data/history/` stores OHLCV and trades as feather, parquet or JSON per pair and timeframe. `freqtrade/data/dataprovider.py` serves cached candles and informative pairs to strategies. Trades, orders, pair locks and wallet history persist through SQLAlchemy in `freqtrade/persistence/` (SQLite by default, Postgres supported).

## Event Loop
`worker.py` calls `FreqtradeBot.process()` every `process_throttle_secs` (default 5 s). Each pass refreshes the pairlist, pulls new candles, runs the strategy on closed candles, checks exits, then places entries.

## Execution
CCXT under `freqtrade/exchange/exchange.py`, with per-venue subclasses. Limit or market orders, order timeouts, price-side config, position adjustment (DCA) and futures with leverage on supported venues. `dry_run: true` simulates fills against live prices.

## Risk
Per-strategy `stoploss`, trailing stop, `minimal_roi` table and `custom_stoploss`. Exchange-side stoploss where supported. Protections in `freqtrade/plugins/protections/`: `cooldown_period.py`, `low_profit_pairs.py`, `max_drawdown_protection.py`, `stoploss_guard.py`. `max_open_trades` and stake sizing via `freqtrade/wallets.py`. Pairlist filters (`freqtrade/plugins/pairlist/`: volume, spread, volatility, age, delist, price) gate the universe.

## Strategies Shipped
- `freqtrade/templates/sample_strategy.py`: RSI crosses 30 with TEMA below the Bollinger middle band and rising, exit on RSI crossing 70 with TEMA above the middle and falling; mirrored for shorts.
- `freqtrade/templates/FreqaiExampleStrategy.py`: FreqAI regressor predicts mean forward close change `&-s_close`; enter when prediction beats a threshold and `do_predict == 1`.
- `freqtrade/templates/FreqaiExampleHybridStrategy.py`: FreqAI classifier labels up/down moves, combined with RSI and TEMA rules.
- `freqtrade/templates/sample_hyperopt_loss.py`: custom loss for hyperopt, rewards trade count, return and short duration.
More community strategies sit in the separate `freqtrade-strategies` repo.

## AI Components
FreqAI (`freqtrade/freqai/`): rolling retrain of LightGBM, XGBoost, scikit-learn random forest, PyTorch MLP and Transformer models (`freqtrade/freqai/prediction_models/`) plus RL agents on 3, 4 or 5 action environments (`freqtrade/freqai/RL/`). Outlier detection (SVM, DBSCAN, dissimilarity index) in `data_kitchen.py`. No LLM component.

## Connectors
Binance, Bybit, OKX, Kraken, Kraken Futures, Gate, HTX, Hyperliquid, KuCoin, Bitget, BingX, Bitvavo, Bitpanda, Crypto.com, CoinEx, HitBTC, IDEX, LBank, Luno (`freqtrade/exchange/`). Notify through Telegram, Discord and webhooks (`freqtrade/rpc/`); REST API and FreqUI web dashboard (`freqtrade/rpc/api_server/`).

## Fit
Best crypto leg for the notify-first system: run in `dry_run` with Telegram alerts and protections on, use FreqAI for ML research. Crypto only; GPL-3.0 restricts redistributing modified code.
