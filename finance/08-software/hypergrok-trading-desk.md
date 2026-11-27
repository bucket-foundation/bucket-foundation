# hypergrok-trading-desk

https://github.com/galleonlabs/hypergrok-trading-desk. License MIT License. Stars 605. Last Push 2026-11-26. Python scripts and agent skill files. Checked 2026-11-27.

## Architecture
Agent plugin for Claude Code, Cursor, Codex, Gemini CLI and Grok. `agents/` defines 7 roles: desk lead, market analyst, research analyst, strategist, risk manager, execution trader, trade reviewer. `skills/` holds 17 skills for Hyperliquid data, orders, positions, websocket and desk process. `scripts/` has stdlib Python tools.

## Data Layer
Hyperliquid public info endpoint for prices, funding, open interest, spread and depth. `research_dataset.py` builds research sets; `account_read.py` reads an account.

## Event Loop
None. Agents work one ticket at a time through a lifecycle skill; websocket guidance exists as a skill.

## Execution
Orders go through an API wallet after human approval. `hooks/exchange_write_gate.py` asks before likely exchange writes. A testnet wallet is the default practice mode.

## Risk
A risk manager role signs off each ticket. `desk-risk-limits`, `stop_cost.py` and `standing_mandate.py` set size, stop cost and mandate bounds; order rounding has tests.

## Strategies Shipped
None. A strategy lab skill structures idea testing.

## AI Components
The whole product is agent roles and skills.

## Connectors
Hyperliquid.

## Fit
Strong pattern for gated agent trading: research mode first, role separation, a hook that blocks silent writes. Venue limited to Hyperliquid.
