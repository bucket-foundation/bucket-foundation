# Financial-API

https://github.com/Hithink-Tech-Org/Financial-API. License MIT. Stars 4,653. Last push 2026-11-27. HTML. Checked 2026-11-27.

## Architecture
Monorepo with four clients on one vendor service: `hithink-finance-cli/` (TypeScript CLI with `application`, `commands`, `contracts`, `domains`, `infrastructure`, `output` layers and schemas), `python/` (`marketdb` package and a `toolkit` with `fuyao` helpers), `dsh-plugins/hithink-finance` (DeepSeek Harness plugin) and `skills/` (REST and MCP agent skills). `docs/` holds the REST and MCP contracts.

## Data Layer
Official Tonghuashun A-share data over REST and MCP: quotes, history, financial statements, indices, sectors, limit-up. `python/marketdb` has providers, importers, updaters, checks and SQL schema to mirror data into a local database.

## Event Loop
None. Request and response.

## Execution
None.

## Risk
None.

## Strategies Shipped
None. `python/tools/inspirations` holds example analyses.

## AI Components
MCP server contract and agent skills so an LLM can query the service; scripts sync API docs and skill contracts to keep them aligned.

## Connectors
Tonghuashun (Hithink) fuyao API, MCP, DeepSeek Harness.

## Fit
Vendor-sanctioned A-share data path for agents, with a local mirror option. Access needs a vendor key.
