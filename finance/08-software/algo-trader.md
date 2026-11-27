# algo-trader

https://github.com/idanya/algo-trader. License MIT. Stars 873. Last push 2023-11-20. Python. Checked 2026-11-27.

## Architecture
Pipeline of sources, processors and terminators in `src/algotrader/pipeline/`. `PipelineRunner` runs pipelines in order over a shared context. Pipelines serialize to JSON templates, so a CLI (`cli/main.py`) can load and run them. A vendored Interactive Brokers client sits in `libs/ib_client`.

## Data Layer
Candle sources: Yahoo Finance history, IB history, Binance history and realtime, MongoDB replay. Storage providers: in-memory and MongoDB. Technicals come from tulipy and attach to each candle.

## Event Loop
Pull-based candle iterator. Each candle passes through the processor chain in sequence. Backtest and live runs share the same chain.

## Execution
`SignalsExecutor` interface with stdout and simple-sum implementations. `InteractiveBrokersConnector` builds MKT, LMT, stop, trailing and MOC/MOO orders. The README states real-time trading is unfinished.

## Risk
None as a module. Stop and trailing order builders exist in the IB connector.

## Strategies Shipped
`simple_sma.py` SMA 5/20 crossover; `connors_rsi2.py` RSI2 mean reversion with SMA exit; `history_cosine_similarity.py` and `history_bucket_compare.py` match current indicator buckets against stored history returns.

## AI Components
None. Cosine similarity over indicator buckets is a statistical match.

## Connectors
Interactive Brokers, Binance, Yahoo Finance, MongoDB.

## Fit
Readable example of a serializable pipeline design for candle backtests. Live execution is a stub, so treat it as a backtest harness.
