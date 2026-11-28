# AlgoBot

https://github.com/Chudleyj/AlgoBot. License not stated. Stars 292. Last push 2018-11-13. C++. Checked 2026-11-27.

## Architecture
Flat C++ program: `main.cpp`, `TechnicalAnalysis.cpp` and `.h` (class with getters and setters for indicator vectors), `IEX.cpp` and `.h` (HTTP client), `JSONdata.cpp`, `GetSetClearTA.cpp`.

## Data Layer
IEX API prices parsed from JSON into vectors.

## Event Loop
Sequential run in `main.cpp`; no scheduler.

## Execution
None. The README says buy, sell and hold decisions are planned.

## Risk
None.

## Strategies Shipped
None. Indicators computed: MACD with signal, RSI, stochastic, and SMA and EMA at 50, 100, 150 and 200 periods.

## AI Components
None.

## Connectors
IEX Cloud through a companion C++ client.

## Fit
Indicator practice code. IEX Cloud has been retired, so the feed no longer works.
