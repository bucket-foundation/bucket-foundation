# defeatbeta-api

https://github.com/defeat-beta/defeatbeta-api. License Apache-2.0. Stars 809. Last push 2026-11-10. Python 3.11+. Checked 2026-11-27.

## Architecture
`Ticker` and `Tickers` classes in `defeatbeta_api/data/` return pandas frames or `Statement` objects. A DuckDB client in `client/` queries parquet files from a Hugging Face dataset. Extras: `reports/tearsheet.py`, an MCP server in `mcp/`, and agent skills in `skills/` (analyst, dcf, earnings analysis).

## Data Layer
Hugging Face `yahoo-finance-data` dataset read through DuckDB with HTTP pooling, an extent index and a local dataset cache. SQL templates under `data/sql`. Prices, statements, TTM EPS and PE, margins, growth, market cap, earnings call transcripts, news, SEC filing list.

## Event Loop
None. Synchronous queries. `benchmark/` holds concurrency tests.

## Execution
None.

## Risk
None. `beta` computes against SPY.

## Strategies Shipped
None. A DCF valuation module produces Excel output with WACC and a 10-year cash flow projection.

## AI Components
`openai_conf.py` configures LLM calls over transcripts and quarterly changes. The MCP server and skills expose the data to Claude and similar agents.

## Connectors
Hugging Face datasets, OpenAI-compatible LLM endpoints, MCP.

## Fit
Free fundamentals and price source for equities, with transcripts. Data is a mirror of Yahoo Finance so licensing and freshness follow that source.
