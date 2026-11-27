# QuantMuse

https://github.com/0xemmkty/QuantMuse. License MIT. Stars 3,043. Last push 2025-07-29. Python. Checked 2026-11-27.

## Architecture
Two halves. Python `data_service/` (fetchers, processors, factors, strategies, backtest, ml, ai, realtime, storage, vector_db, dashboard, web) and a C++ `backend/` with `data_loader`, `strategy`, `order_executor` and `risk_manager` plus tests. `Trading_Engine_Architecture.md` describes the C++ design.

## Data Layer
Yahoo, Alpha Vantage and Binance fetchers; cache manager, database manager and file storage; a vector store for text embeddings.

## Event Loop
Backtest engine places orders over a DataFrame; a websocket client and real-time feed handle live data.

## Execution
C++ `OrderExecutor` skeleton. `place_order` in the Python backtest engine simulates fills.

## Risk
C++ `RiskManager` with limits for position size, drawdown, leverage, daily loss and concentration, checked per order.

## Strategies Shipped
`builtin_strategies.py`: Momentum, Value, QualityGrowth, MultiFactor and MeanReversion, each selecting names from factor screens; `strategy_optimizer.py` tunes parameters.

## AI Components
LangChain agent, LLM integration, sentiment analyzer, news and social media processors, and a sentiment factor.

## Connectors
Yahoo, Alpha Vantage, Binance.

## Fit
Wide template for factor research with an LLM sentiment layer. The live execution path is a stub.
