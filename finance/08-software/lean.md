# QuantConnect LEAN

https://github.com/QuantConnect/Lean · Apache-2.0 · 22,749 stars · last push 2026-11-25 · C# with Python algorithms · checked 2026-11-27

## Architecture
Event-driven engine behind QuantConnect cloud. `Engine/` (AlgorithmManager, DataFeeds, RealTime, TransactionHandlers, Results, Setup), `Common/` (securities, orders, brokerage models), `Algorithm/` (`QCAlgorithm` API), `Algorithm.Framework/` (Universe, Alpha, Portfolio Construction, Risk, Execution models), `Indicators/`, `Optimizer/`, `Report/`, `Research/`. Python algorithms run through Python.NET. Local runs via the `lean` CLI and Docker.

## Data Layer
LEAN zip format by asset, resolution and date under `Data/`. `DownloaderDataProvider/` pulls from vendors; subscription manager merges equities, options, futures, forex, CFD, crypto, index, custom data. Universe selection on fundamentals, ETF constituents, option chains.

## Event Loop
`Engine/AlgorithmManager.cs` steps time slices; each `Slice` triggers `OnData`, then framework models: alpha emits insights, portfolio construction turns insights into targets, risk adjusts targets, execution places orders. Scheduled events and warm-up handled by the real-time handler.

## Execution
`TransactionHandlers/` route orders to a brokerage. Fill, slippage, fee, buying power, margin and settlement models per brokerage model in `Common/Brokerages/` (38 models). Paper brokerage in `Brokerages/Paper`.

## Risk
`Algorithm.Framework/Risk/`: MaximumDrawdownPercentPerSecurity, MaximumDrawdownPercentPortfolio, MaximumSectorExposure, MaximumUnrealizedProfitPercentPerSecurity, TrailingStop. Margin call events.

## Strategies Shipped
Framework models: `Alphas/` EmaCross, Macd, Rsi, HistoricalReturns, Constant, BasePairsTrading, PearsonCorrelationPairsTrading. Portfolio: EqualWeighting, InsightWeighting, ConfidenceWeighted, BlackLitterman, MeanVariance, MeanReversion (OLMAR style), RiskParity, SectorWeighting, Accumulative. Execution: Immediate, SpreadExecution, StandardDeviation, VWAP. Full algorithms in `Algorithm.Python/` and `Algorithm.Python/Alphas/`, listed in `STRATEGIES-IN-CODE.md` (about 60 strategy algorithms out of 458 files).

## AI Components
Example ML algorithms: `KerasNeuralNetworkAlgorithm.py`, `TensorFlowNeuralNetworkAlgorithm.py`, `PytorchNeuralNetworkAlgorithm.py`, `NLTKSentimentTradingAlgorithm.py`, `TrainingExampleAlgorithm.py`. Cloud adds Mia LLM assistant and MCP server, outside this repo.

## Connectors
Brokerage models for IBKR, Alpaca, Tradier, TradeStation, Charles Schwab, Tastytrade, Webull, Oanda, Binance (spot, US, futures), Bybit, Coinbase, Kraken, Bitfinex, dYdX, Zerodha, Samco, eToro and others; live brokerage plugins ship as separate repos. Signal export to Collective2, Numerai, CrunchDAO, vBase.

## Fit
Most complete multi-asset backtester with options and futures data handling. Use locally for equity, options and futures research; cloud plan adds data. C# core makes deep changes costly.
