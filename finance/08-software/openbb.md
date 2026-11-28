# OpenBB

https://github.com/OpenBB-finance/OpenBB (redirects to openbq-org/OpenBB). License Apache-2.0 per the LICENSE file (GitHub reports NOASSERTION). Stars 75,789. Last push 2026-11-25. Python. Checked 2026-11-27.

## Architecture
Open Data Platform. `openbb_platform/core` defines a provider-agnostic command router; `extensions/` (equity, crypto, economy, fixedincome, derivatives, news, quantitative, technical, econometrics) expose typed endpoints; `providers/` implement fetchers. Results return as an `OBBject` that converts to pandas, polars or JSON.

## Data Layer
Fetcher classes per provider with a standard query and data model. Free providers shipped in the repo: BLS, CBOE, CFTC, Deribit, ECB, EIA, Fama-French, Federal Reserve, FINRA, FRED, IMF, Nasdaq, OECD, SEC, TMX. Paid providers install as extensions.

## Event Loop
None. Request and response.

## Execution
None.

## Risk
None.

## Strategies Shipped
None.

## AI Components
`extensions/mcp_server` exposes every endpoint as MCP tools for agents. `platform_api` serves the same as REST.

## Connectors
Data only, about 15 bundled providers plus pip extensions.

## Fit
Data and research layer for the notify-first system: macro (FRED, BLS, Fed), SEC filings, COT reports, options chains from CBOE. The MCP server gives an LLM research agent the same data without custom glue.
