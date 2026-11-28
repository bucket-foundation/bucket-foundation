# indicatorts

https://github.com/cinar/indicatorts. License MIT. Stars 481. Last push 2026-11-24. TypeScript. Checked 2026-11-27.

## Architecture
Library in `src/`: `indicator/` (about 200 files in `momentum`, `trend`, `valuation`, `volatility`, `volume`), `strategy/` (actions, asset, resample, `strategyFunction.ts`), `backtest/` (`backtest.ts`, `strategyStats`, `strategyResult`, `companyResult`), `chart/`, `company/`, `helper/`.

## Data Layer
Plain number arrays and OHLCV objects supplied by the caller. Reference test data under `testdata`.

## Event Loop
None. Functions run over full arrays.

## Execution
None. A strategy returns an array of actions (buy, sell, hold) that the backtester scores.

## Risk
Strategy statistics: gain, max drawdown and similar in `strategyStats.ts`.

## Strategies Shipped
`examples/`: buy and hold, plus about 30 indicator strategies by family: momentum (RSI2, Awesome Oscillator, Ichimoku, Stochastic, Williams %R), trend (MACD, Aroon, KDJ, Parabolic SAR, Vortex, VWMA), volatility (Bollinger Bands, Acceleration Bands), volume (Chaikin Money Flow, Ease of Movement).

## AI Components
None. Repo ships a `CLAUDE.md`.

## Connectors
None.

## Fit
Dependency-light TypeScript indicator and strategy library. Useful for browser or Node signal prototyping.
