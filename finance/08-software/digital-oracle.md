# digital-oracle

https://github.com/komako-workshop/digital-oracle. License MIT. Stars 917. Last push 2026-07-26. Python. Checked 2026-11-27.

## Architecture
Python package `digital_oracle/` of data providers plus an agent skill (`SKILL.md`, `references/`). Each provider in `providers/` wraps one source behind a common base: BIS, CFTC, CME FedWatch, CoinGecko, Deribit, Eastmoney, EDGAR, Fear and Greed, Kalshi, Polymarket, prices, Stooq, Treasury, World Bank, Yahoo and yfinance. Shared pieces: `http.py`, `cache.py`, `concurrent.py`, `proxy_pool.py` and `snapshots.py`.

## Data Layer
Public HTTP APIs read through a cached client. `snapshots.py` has a `RecordingHttpClient` and `ReplayHttpClient` that save and replay responses for tests. `scripts/regression_runner.py` runs provider regressions.

## Event Loop
None. The agent calls providers on demand, in parallel through `concurrent.py`.

## Execution
None.

## Risk
None.

## Strategies Shipped
None. The skill turns provider output into probability estimates for macro questions on housing, gold, BTC and geopolitics.

## AI Components
Skill instructions for Claude Code, Cursor, Codex and OpenClaw that direct an agent to pull market-implied signals (prediction market odds, yield curve, CFTC positioning, options skew) and write a reasoned estimate.

## Connectors
13 sources, among them Polymarket, Kalshi, Deribit, US Treasury, CFTC, SEC EDGAR and Chinese A-share flow data.

## Fit
Useful as a provider set for macro-signal retrieval and for the record-and-replay HTTP test pattern. Outputs are interpretations of market prices and carry no verified edge.
