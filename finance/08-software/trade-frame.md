# trade-frame

https://github.com/rburkholder/trade-frame. License NOASSERTION. Stars 685. Last Push 2026-10-13. C++17. Checked 2026-11-27.

## Architecture
CMake tree of libraries in `lib/` (`TFTrading`, `TFTimeSeries`, `TFIndicators`, `TFOptions`, `TFSimulation`, `TFStatistics`, `TFHDF5TimeSeries`, `TFVuTrading`) and about 40 applications such as `BasketTrading`, `Hedge`, `IndicatorTrading`, `OptionTrader`, `Collector`, `Scanner` and `ESBracketOrder`.

## Data Layer
Provider-fed quotes and trades into time series, stored in HDF5 and SQLite or PostgreSQL through the OU libraries. IQFeed supplies symbol lists and history.

## Event Loop
Callback-driven with signals on provider events, wxWidgets GUI front ends, and worker threads. `TFSimulation` merges dated datums from threads to replay history through the same provider interface.

## Execution
`Position`, `Order`, `Portfolio` and `Account` classes in `TFTrading`, with order routing through provider classes and `SimulateOrderExecution` for paper runs.

## Risk
`BasketTrading/MoneyManager` sizes positions; bracket and stop logic sit inside each application. No shared risk engine.

## Strategies Shipped
Basket trading with option overlays, hedged Bollinger, pivot crossing, weeklies and OverUnder scanners, and gold option trading.

## AI Components
`TFGP` and `OUGP` carry genetic programming code. No LLM use.

## Connectors
Interactive Brokers TWS, Alpaca, IQFeed, Phemex, and a simulator.

## Fit
Low-latency C++ reference with options and market data depth. A different stack from the Python-based rest of the system, so it serves as an idea source.
