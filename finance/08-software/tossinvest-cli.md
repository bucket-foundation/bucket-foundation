# tossinvest-cli

https://github.com/JungHoonGhae/tossinvest-cli. License MIT. Stars 523. Last push 2026-11-23. Go. Checked 2026-11-27.

## Architecture
Go CLI `tossctl` in `cmd/tossctl/` over `internal/` packages: `client`, `auth`, `session`, `official` (OpenAPI), `orderintent`, `confirmation`, `papertrading`, `pricealert`, `monitor`, `mcp`, `routing`, `replay`. A Python `auth-helper` handles login through a browser.

## Data Layer
Toss Securities web endpoints and the official OpenAPI for quotes, charts, portfolio, history, tax and watchlists. Local snapshots of assets and portfolio.

## Event Loop
`stream`, `monitor` and `quote_alert` commands poll or stream and fire alerts. `push` sends notifications.

## Execution
`order` commands preview first. A live order needs `--execute` and a `--confirm` token from the preview. `papertrading` simulates orders.

## Risk
Confirmation token gate, feature gates, order lineage records. No position limits.

## Strategies Shipped
None.

## AI Components
`mcp` server and `skill` command expose account and market data to agents. `examples/trading-agents/bridge.py` links a multi-agent trading framework.

## Connectors
Toss Securities.

## Fit
Agent-ready broker CLI for Korean equities with a preview-then-confirm order gate worth copying.
