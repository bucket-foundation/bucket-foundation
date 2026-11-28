# freqtrade-strategies

https://github.com/freqtrade/freqtrade-strategies. License GPL-3.0. Stars 5,688. Last push 2026-09-08. Python. Checked 2026-11-27.

## Architecture
Collection of `IStrategy` subclasses in `user_data/strategies/` for the Freqtrade bot: 30 top-level files, a `berlinguyinca/` folder of community strategies, a `futures/` folder and a `lookahead_bias/` folder of negative examples.

## Data Layer
Inherited from Freqtrade: pandas DataFrames of candles per pair and timeframe, TA-Lib indicators, informative pairs for other timeframes.

## Event Loop
Freqtrade calls `populate_indicators`, `populate_entry_trend` and `populate_exit_trend` per candle.

## Execution
Handled by the host bot through ccxt. `TWAPStrategy.py` and `AlmgrenChrissStrategy.py` split orders into slices over time.

## Risk
Per-file `stoploss` and `minimal_roi` tables. `FixedRiskRewardLoss.py` and `CustomStoplossWithPSAR.py` use `custom_stoploss`; `BreakEven.py` moves the stop to entry plus fees.

## Strategies Shipped
`Strategy001` to `Strategy005`, `Supertrend`, `Bandtastic`, `MultiMa`, `PatternRecognition`, `SwingHighToSky`, `TrendRiderStrategy`, `UniversalMACD`, `VolatilitySystem`, plus about 30 more.

## AI Components
`GodStra.py` and `mabStra.py` search indicator sets by algorithm; no learned models.

## Connectors
Freqtrade only.

## Fit
Large pool of parameterized crypto rules for backtest seeding. Several are overfit to old periods.
