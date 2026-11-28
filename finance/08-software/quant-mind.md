# quant-mind

https://github.com/LLMQuant/quant-mind. License MIT. Stars 3,144. Last push 2026-08-15. Python. Checked 2026-11-27.

## Architecture
Package `quantmind/`: `preprocess/` (fetch, clean, format), `etl/` (batch and pipeline records), `flows/` (paper, news and earnings runners), `knowledge/` (typed items: `Paper`, `Factor`, `Thesis`, news, earnings), `library/` (local store), `rag/`, `mind/retrieval.py` and `configs/`. Repo has `AGENTS.md` and `CLAUDE.md` for coding agents.

## Data Layer
Paper PDFs, news and earnings text are parsed into structured knowledge objects with citations, bounding boxes and source facts, then stored in a local library for retrieval.

## Event Loop
Batch flows per document.

## Execution
None.

## Risk
None.

## Strategies Shipped
None. A `Factor` knowledge type captures factor definitions extracted from papers; `Thesis` records an investment thesis.

## AI Components
Agent-native extraction through `openai-agents` and `litellm`, with citation validation and retrieval over the library.

## Connectors
OpenAI-compatible model endpoints via litellm; paper and news fetchers.

## Fit
Knowledge layer for turning research papers into structured factor and thesis records. Strong fit for a citation-first pipeline; no trading logic.
