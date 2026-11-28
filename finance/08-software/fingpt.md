# FinGPT

https://github.com/AI4Finance-Foundation/FinGPT · MIT · 21,728 stars · last push 2026-11-18 · Python and Jupyter · checked 2026-11-27

## Architecture
A collection of projects under `fingpt/`, each standalone: LoRA fine-tuning recipes for open LLMs (Llama 2 and 3, ChatGLM2, Falcon, Qwen), benchmarks, a forecaster, RAG and sentiment pipelines. A newer `finogrid/` tree adds a cross-border payments stack (corridors, compliance gate, ledger, MCP tools) unrelated to trading.

## Data Layer
News and price fetchers in `fingpt/FinGPT_Forecaster/data_pipeline.py` and `data.py` (Finnhub company news, yfinance prices, SEC basics). Sentiment datasets (FPB, FiQA, TFNS, NWGI) in `fingpt/FinGPT_Benchmark/` and `FinGPT_Sentiment_Analysis_v3/data`. RAG retrieval in `fingpt/FinGPT_RAG/multisource_retrieval/`.

## Event Loop
None. Batch scripts and notebooks; the forecaster serves a Gradio app (`FinGPT_Forecaster/app.py`).

## Execution
None. No broker code in the trading path.

## Risk
None beyond `fingpt/FinGPT_ForexIntelligence/trade_generator.py` listing risk factors per idea and `timing_model.py` delaying trades around scheduled events.

## Strategies Shipped
- `fingpt/FinGPT_Forecaster/`: LoRA-tuned Llama 2 7B reads past week news and basics, predicts next-week up or down with a percent band; `backtest.py` scores the predictions against archived closes.
- `fingpt/FinGPT_ForexIntelligence/trade_generator.py`: rank currencies by strength from macro and sentiment analyzers, pair strongest with weakest, score confidence with session alignment.
- `fingpt/FinGPT_ForexIntelligence/timing_model.py`: wait, enter or avoid based on upcoming high-impact events.
- `fingpt/FinGPT_Sentiment_Analysis_v3/quantitative_sentiment.py`: label earnings positive or negative when EPS surprise against consensus exceeds 5%.
- `fingpt/FinGPT_Others/FinGPT_Trading/`, `FinGPT_Robo_Advisor/`: ChatGPT trading and robo-advisor demos (v1, v2) that turn news into buy or sell calls.

## AI Components
The whole repo. LoRA training scripts (`train_lora.py`), 8-bit and 4-bit training variants, benchmark runner, multi-agent RAG notebook (`fingpt/FinGPT_MultiAgentsRAG/`), AG2 analysis pipeline notebook.

## Connectors
Finnhub, yfinance, SEC EDGAR, Hugging Face Hub models.

## Fit
Source of fine-tuned sentiment models and a forecaster prompt format. Use as a news-scoring feature in the alert layer; keep it out of order decisions. Code quality varies by subfolder.
