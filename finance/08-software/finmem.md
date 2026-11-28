# FinMem

https://github.com/pipiku915/FinMem-LLM-StockTrading. License MIT. Stars 973. Last push 2024-08-18. Python. Checked 2026-11-27.

## Architecture
`puppy/`: `agent.py` (LLM agent with a character profile), `memorydb.py` (short, mid and long-term memory layers plus reflection memory), `memory_functions/` (recency, importance, decay, access counter, compound score), `reflection.py`, `environment.py`, `portfolio.py`.

## Data Layer
Daily price, news, and 10-K and 10-Q filings per ticker from pickled environment files.

## Event Loop
Day-by-day `step`: ingest news and filings into memory, query memories, reflect, output buy, hold or sell.

## Execution
Simulated single-ticker portfolio.

## Risk
None.

## Strategies Shipped
Single-stock LLM trading driven by layered memory retrieval.

## AI Components
OpenAI, Gemini or TGI-hosted models; embedding-based memory search.

## Connectors
None.

## Fit
Research reference for agent memory design. Stale since 2024.
