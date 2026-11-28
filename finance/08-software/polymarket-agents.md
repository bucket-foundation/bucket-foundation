# Polymarket Agents

https://github.com/Polymarket/agents · MIT · 3,818 stars · last push 2024-11-05 · Python · checked 2026-11-27

## Architecture
Small LangChain app. `agents/application/trade.py` (`Trader`), `executor.py` (LLM calls), `prompts.py`, `creator.py` (market idea generation), `cron.py`. `agents/polymarket/` wraps Gamma and CLOB APIs. `agents/connectors/` holds Chroma vector store, NewsAPI and Tavily search.

## Data Layer
`polymarket/gamma.py` pulls events and markets from the Gamma API. `connectors/chroma.py` embeds event descriptions with OpenAI embeddings into local Chroma DBs, cleared each run.

## Event Loop
One-shot pipeline `one_best_trade`: fetch tradeable events, RAG filter, map to markets, filter markets, ask the LLM for a superforecast and trade, size it. Retries by recursion on any exception. `cron.py` schedules runs.

## Execution
`polymarket/polymarket.py` builds and signs orders through `py_clob_client`, `execute_market_order`. The call in `trade.py` is commented out with a terms-of-service note, so the shipped bot does not trade.

## Risk
None. No position limits, no stop, `maintain_positions` and `incentive_farm` are empty stubs.

## Strategies Shipped
- `agents/application/trade.py` `one_best_trade`: LLM picks one market and side from RAG-filtered events plus news, then sizes a market order.
- `agents/application/creator.py`: LLM proposes new markets to create.

## AI Components
`ChatOpenAI` with `gpt-3.5-turbo-16k` default (`executor.py`), superforecaster prompt in `prompts.py`, OpenAI embeddings, Chroma RAG.

## Connectors
Polymarket Gamma and CLOB on Polygon, NewsAPI, Tavily.

## Fit
Reference for prompt and RAG plumbing on Polymarket. Stale and unsafe for capital. Reuse the data fetch pattern only.
