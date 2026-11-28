# aktools

https://github.com/akfamily/aktools. License MIT. Stars 1,584. Last push 2026-11-24. Python. Checked 2026-11-27.

## Architecture
FastAPI app in `aktools/main.py` with routes in `core/api.py` and a CLI in `cli.py`. `core/` splits into `fetch.py` (calls AKShare functions), `catalog.py` (interface registry and docstring parsing), `cache.py`, `auth.py`, `formats.py`, `network.py` and `storage.py`. `mcp_server.py` exposes the same catalog as an MCP server.

## Data Layer
Wraps AKShare, which scrapes Chinese and global market sites. `ResultCache` holds query results with a TTL and `InFlight` collapses duplicate concurrent requests. `save_csv` writes pulls to a data directory.

## Event Loop
HTTP request and response through uvicorn. A janitor clears AKShare internal caches on an interval.

## Execution
None. Read-only data service.

## Risk
Token middleware (`TokenAuthMiddleware`) guards routes. Row limits raise `TooManyRowsError`. Detects upstream bans on the push2 host and reports them.

## Strategies Shipped
None.

## AI Components
MCP server with tools `search_interfaces`, `describe_interface`, `get_data` over HTTP at `/mcp` or stdio via `aktools-mcp`. A stdio-only `save_data` tool writes files.

## Connectors
AKShare interfaces for A-share, futures, funds, macro and bond data. Output as JSON, CSV or XLSX.

## Fit
Fastest route to AKShare coverage of Chinese markets for an agent, with the MCP surface already built.
