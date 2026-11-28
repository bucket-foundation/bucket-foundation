# HFTENGINE

https://github.com/mirkovicdev/HFTENGINE. License MIT. Stars 350. Last push 2026-09-17. TypeScript, Rust, Python. Checked 2026-11-27.

## Architecture
Replay console around a vendored copy of hftbacktest with a patch exposing queue position getters. `runner/` is a Rust binary (`main.rs`, `queue.rs`, `record.rs`) that writes `.hbr` session files. `dashboard/` is a Vite and TypeScript viewer with nine panels (book, queue, fills, latency, tape, market, collector, engine, log). `tools/` holds Python scripts to collect and prepare data.

## Data Layer
`tools/collect.py` records Binance USDT-M Futures order book and trades. `prepare.py` converts them to npz for the engine. Sessions are `.hbr` files read by the browser.

## Event Loop
Simulated-time loop inside hftbacktest, stepped at a frame interval that doubles as the strategy decision interval.

## Execution
Simulated exchange with constant or interpolated order latency and probabilistic queue models. `RecordingQueueModel` wraps the inner queue model to log the queue estimate of each resting order.

## Risk
Fee model and risk-averse queue model options. No separate risk module.

## Strategies Shipped
Grid market making with inventory skew and a queue-position strategy, both taken from hftbacktest examples.

## AI Components
None.

## Connectors
Binance Futures feed through the collector.

## Fit
Visual debugger for market-making backtests. Shows why a resting order fills or stays unfilled.
