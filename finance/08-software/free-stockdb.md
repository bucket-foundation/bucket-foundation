# free-stockdb

https://github.com/hello245m/free-stockdb. License MIT. Stars 3,207. Last push 2026-11-11. HTML. Checked 2026-11-27.

## Architecture
C++ engine in `cpp/` (`server.cpp`, `client.cpp`, `updater.cpp`, tools `main_server.cpp` and `main_updater.cpp`) with Python wrappers in `pybao/` (`stock_sdk.py`, `zhibiao.py`, `native_mcp.py`) and an MCP launcher under `调用方式/ai_mcp`. Five call paths: Python, HTTP, Excel or WPS, an HTML page and MCP. Releases are prebuilt binaries.

## Data Layer
Local on-disk store of A-share daily, weekly, monthly, 1 to 30 minute, tick and ETF minute bars. The updater syncs incrementally and cleans data; adjustment (forward and backward) is applied in memory by `_apply_fq_in_memory`. Source notes are in `docs/DATA_SOURCE.md`.

## Event Loop
Server process answering queries on port 7899; a separate updater process syncs.

## Execution
None.

## Risk
None.

## Strategies Shipped
None. `zhibiao.py` computes 39 indicators and 5 index types locally.

## AI Components
`native_mcp.py` exposes the database over MCP for agents.

## Connectors
Upstream data sources listed in the docs; password-protected local socket.

## Fit
Local data engine for full-market minute backtests without remote calls. Source code covers the client side; the data fetch binary is distributed as a release.
