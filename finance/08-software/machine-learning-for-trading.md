# Machine Learning for Trading

https://github.com/stefan-jansen/machine-learning-for-trading · MIT · 22,089 stars · last push 2026-11-25 · Jupyter notebooks with paired `.py` · checked 2026-11-27

## Architecture
Companion code for the book, now 27 chapters (`01_process_is_edge` to `27_systematic_edge`) plus `case_studies/` (9 studies across ETFs, crypto perps funding, NASDAQ-100 15-minute, S&P 500 equity and options, US firm characteristics, FX pairs, CME futures, US equities panel). Shared helpers in `utils/` (cv_splits, data_quality, modeling, reproducibility). 765 Python files.

## Data Layer
`02_financial_data_universe`, `03_market_microstructure`, `04_fundamental_alternative_data`, `05_synthetic_data` cover vendors, order book data, fundamentals and GAN/diffusion synthetic series. `utils/downloading.py` and `data/` cache Parquet.

## Event Loop
Taught across chapters with no single engine. `16_strategy_simulation` builds a backtest from first principles and compares parity across vectorbt, zipline, backtrader and LEAN (`15_lean_engine_parity.py`, `17_backtrader_zipline_engine_parity.py`, `18_vectorbt_engine_parity.py`). `25_live_trading/07_order_state_machine.py` models order states.

## Execution
`25_live_trading/`: IB paper (`03_ib_paper_trading_demo.py`), Alpaca paper (`04`), Alpaca crypto (`05`), QuantConnect case study (`06`), IB basket rebalance (`12`). `18_transaction_costs` and `21_rl_execution_hedging/02_optimal_execution_ppo.py` cover costs and RL execution.

## Risk
`19_risk_management`, `16_strategy_simulation/11_sharpe_ratio_inference.py`, `12_dsr_validation.py` (deflated Sharpe), `13_ras_protocol.py`, `20_strategy_synthesis/07_regime_risk.py`, `25_live_trading/10_safety_risk_demo.py` and `13_runtime_safety_showcase.py` (kill switches, limits).

## Strategies Shipped
- `case_studies/*`: per study, a label (forward return) and ML model ranking the universe.
- `12_gradient_boosting`, `13_dl_time_series`, `14_latent_factors`: LightGBM, LSTM and transformer forecasts, PCA and autoencoder factors.
- `21_rl_execution_hedging/03_market_making_ppo.py`: PPO market maker; `05_deep_hedging_pfhedge.py`: deep hedging.
- `25_live_trading/09_crypto_funding_deployment_loop.py`: funding-rate model on perps; `11_fx_deployment_loop.py`: FX daily model; `02_etfs_deployment_loop.py`: ETF ranking loop.
- `17_portfolio_construction`: mean variance, HRP, risk parity.

## AI Components
`22_rag_financial_research` (SEC filings RAG, hybrid retrieval, RAGAS eval, RAG security), `23_knowledge_graphs`, `24_autonomous_agents` (ReAct, tool contracts, multi-agent research, adversarial debate, forecasting pipeline, evaluation and governance; providers for OpenAI, Anthropic, Ollama in `agent_providers.py`).

## Connectors
IB, Alpaca, QuantConnect, plus data vendor clients across chapters.

## Fit
Curriculum and validation recipes (deflated Sharpe, CV splits, runtime safety). Copy patterns; do not deploy as a system.
