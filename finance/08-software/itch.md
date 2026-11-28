# ITCH

https://github.com/martinobdl/ITCH. License Apache License 2.0. Stars 288. Last push 2021-10-22. C++. Checked 2026-11-27.

## Architecture
C++ with `include/` and `src/`: `Reader`, `Message`, `Order`, `OrderPool`, `OrderBook`, `BookConstructor`, `Writer`. Google Test suites in `gtests/`. `examples/` holds Python simulation and analysis notebooks.

## Data Layer
Reads NASDAQ TotalView ITCH 5.0 binary files and writes reconstructed book snapshots and messages to files. Python notebooks load the output.

## Event Loop
Sequential pass over the message stream, one handler per message type.

## Execution
Simulation only. `examples/Algo.py`, `Algo_fixedSpread.py` and `Algo_lowRegret.py` step through messages in `environment.py`.

## Risk
None.

## Strategies Shipped
`Algo_fixedSpread.py` quotes at a fixed spread in ticks; `Algo_lowRegret.py` adapts quotes with a regret-minimizing rule.

## AI Components
`tree_from_forest.dot` in the examples comes from a tree ensemble study; no model code in the C++.

## Connectors
ITCH 5.0 files.

## Fit
Order book reconstruction from raw exchange messages, with a sandbox for market-making algorithms.
