# Zipline Reloaded

https://github.com/stefan-jansen/zipline-reloaded · Apache-2.0 · 2,022 stars · last push 2026-11-25 · Python with Cython · checked 2026-11-27

## Architecture
Maintained fork of Quantopian's Zipline. `src/zipline/algorithm.py` (`TradingAlgorithm`), `gens/` (simulation clock and tradesimulation), `finance/` (blotter, ledger, slippage, commission, controls), `pipeline/` (cross-sectional factor engine), `data/` (bundles, bar readers), `assets/`.

## Data Layer
Ingested bundles in `data/bundles/`: `csvdir`, `quandl`, custom. bcolz/HDF5 daily and minute bar readers, adjustment database for splits and dividends, asset database in SQLite. Exchange calendars from `exchange_calendars`.

## Event Loop
`gens/tradesimulation.py` emits bar events on the trading calendar; calls `initialize`, `before_trading_start`, `handle_data`, scheduled functions. Pipeline computes factors once per day before the open.

## Execution
Simulated. `finance/blotter` holds orders; slippage models `VolumeShareSlippage`, `FixedSlippage`, `FixedBasisPointsSlippage`, `VolatilityVolumeShare`; commissions `PerShare`, `PerTrade`, `PerDollar`, `PerContract`, `PerFutureTrade`. No live broker in this fork.

## Risk
`finance/controls.py`: `MaxOrderCount`, `MaxOrderSize`, `MaxPositionSize`, `LongOnly`, `RestrictedListOrder`, `AssetDateBounds`, `MaxLeverage`, `MinLeverage`. Metrics tracker in `finance/metrics`.

## Strategies Shipped
- `src/zipline/examples/buy_and_hold.py`: buy and hold.
- `buyapple.py`: buy 10 AAPL each bar.
- `dual_moving_average.py`: 100/300 day SMA crossover on AAPL.
- `dual_ema_talib.py`: EMA crossover using TA-Lib.
- `momentum_pipeline.py`: pipeline ranks by momentum, rebalance into top names.
- `olmar.py`: On-Line Moving Average Reversion portfolio.

## AI Components
None.

## Connectors
None live. Data bundles only.

## Fit
Daily US equity factor research with Pipeline and Alphalens/Pyfolio. Legacy design; prefer LEAN or Nautilus for anything that goes live.
