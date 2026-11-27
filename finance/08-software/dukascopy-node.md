# dukascopy-node

https://github.com/Leo4815162342/dukascopy-node. License MIT. Stars 992. Last push 2026-11-23. TypeScript. Checked 2026-11-27.

## Architecture
npm package `dukascopy-node` v1.51.1 with a CLI. Pipeline modules in `src/`: `config` and `config-validator`, `dates-normaliser`, `url-generator`, `buffer-fetcher` (with rate limiting), `cache-manager`, `processor`, `data-normaliser`, `aggregator` (OHLC), `output-formatter`, `stream-writer` and `waf` handling. Entry functions `getHistoricalRates.ts` and `getRealTimeRates.ts`.

## Data Layer
Downloads Dukascopy binary tick files (compressed) over HTTP, decodes them, and aggregates ticks into minute, hour or day candles. Optional file cache on disk. Output as JSON, CSV or arrays. Test fixtures cover BTC-USD and EUR-USD.

## Event Loop
None. Async batches of downloads with configurable batch size and pause between batches.

## Execution
None.

## Risk
None. Rate limiting protects the data source from the client.

## Strategies Shipped
None.

## AI Components
None.

## Connectors
Dukascopy public data feed for forex, crypto, stocks, ETFs and CFDs. Examples include a headless-browser path for the site's web application firewall.

## Fit
Free source of historical tick data for backtests, usable from the CLI or Node. Dukascopy terms govern redistribution of the data.
