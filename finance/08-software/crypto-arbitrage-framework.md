# crypto-arbitrage-framework

https://github.com/hzjken/crypto-arbitrage-framework. License None stated. Stars 704. Last Push 2019-09-03. Python. Checked 2026-11-27.

## Architecture
Three classes in `crypto/`: `PathOptimizer` (`path_optimizer.py`), `AmtOptimizer` (`amount_optimizer.py`) and `TradeExecutor` (`trade_execution.py`). Both optimizers extend the CPLEX `Model`. `exchanges.py` lists the ccxt venues and `main.py` wires the three together.

## Data Layer
ccxt REST tickers and order books fetched in parallel threads per exchange. No database; `save_record` appends each solution to `record.txt`.

## Event Loop
Synchronous script loop in `main.py`: find path, optimize amounts, execute, sleep 20 seconds.

## Execution
`TradeExecutor` submits orders per exchange in threads, splits intra-exchange and inter-exchange legs, and cancels the leg and the rest of the path when an order waits past a threshold. Includes KuCoin main-to-trade wallet transfers.

## Risk
Constraints live inside the optimizers: path length cap, minimum trade size, balance limits, order book depth, precision, fees and withdrawal costs. No separate risk module.

## Strategies Shipped
Multi-lateral arbitrage over a currency network, solved as a linear program with a second program sizing each leg against order book levels.

## AI Components
None.

## Connectors
ccxt, with KuCoin, Binance and Bittrex configured by default.

## Fit
A compact example of formulating arbitrage as an optimization problem instead of enumerating triangles. Needs a CPLEX licence, and the code has been idle since 2019.
