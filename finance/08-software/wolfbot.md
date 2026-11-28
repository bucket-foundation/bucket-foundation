# WolfBot

https://github.com/Ekliptor/WolfBot. License AGPL-3.0. Stars 791. Last push 2023-02-17. TypeScript on Node.js. Checked 2026-11-27.

## Architecture
`app.ts` runs a web UI and `TradeAdvisor` coordinating `src/Trade` (RealTimeTrader, PortfolioTrader, Backtester), `src/Strategies` (133 files), `src/Arbitrage`, `src/Lending` and `src/AI`. Exchange classes in `src/Exchanges`.

## Data Layer
MongoDB through `database.ts`. Candle makers and streams in `src/Trade/Candles`. History exchange class replays stored data for backtests.

## Event Loop
Websocket trade streams feed strategies on every trade. Strategies emit buy and sell events that other strategies on different candle sizes can consume.

## Execution
Order trackers for live and backtest (`RealTimeOrderTracker`, `BacktestOrderTracker`). Margin, futures and lending exchange base classes.

## Risk
Strategy classes for stops: `TrailingStop`, `SARStop`, `TimeStop`, `StopLossTurn`, `ProtectProfit`, `EarlyStopLoss`, and `MarginChecker.ts`.

## Strategies Shipped
133 files: RSI, MACD, DEMA, Ichimoku, BollingerBands, Wyckoff, PingPong, Scalper, OrderBookPressure, WhaleWatcher, CurrencyPairArbitrage, CopyTrader, SwapInterestCollector.

## AI Components
`src/AI/Brain.ts` trains a synaptic neural network on history (`backfind.ts --train`) and predicts prices in live mode. Parameter search by Cartesian grid or genetic algorithm.

## Connectors
Binance, Bitfinex, BitMEX, Bybit, Kraken, Coinbase Pro, Deribit, OKEX and others, plus CCXT for 130 more.

## Fit
Large feature set for crypto margin and lending bots. Last commit is early 2023 and several venues are defunct (FTX, Cobinhood, Coss). AGPL license applies to derived services.
