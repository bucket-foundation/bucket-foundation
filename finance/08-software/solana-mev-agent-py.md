# solana-mev-agent-py

https://github.com/urani-trade/solana-mev-agent-py. License MIT. Stars 299. Last push 2024-09-06. Python. Checked 2026-11-27.

## Architecture
Agent template named Aleph. `src/agents/aleph.py` extends `base.py`; `orders/` models batches, intents, quotes and solutions; `p2p/level_one.py` matches intents; `liquidity/` (Jupiter, Binance); `oracles/` (Pyth, Helius, Dexscreener); `sol/` (accounts, blocks, transactions); `protocol_server/` is a local Flask-style server with HTML views.

## Data Layer
Batches fetched from the protocol server; prices from oracles; quotes from Jupiter. Results written as files.

## Event Loop
asyncio. `solve_order` runs `p2p_strategy` first, then `routing` for unmatched intents with threads for quotes.

## Execution
Builds `SolutionData` from an intent match or a Jupiter quote and returns it to the protocol server. No transaction signing in the template.

## Risk
None.

## Strategies Shipped
Peer-to-peer intent matching with `both_fillable`; routing against Jupiter quotes.

## AI Components
None.

## Connectors
Jupiter, Pyth, Helius, Dexscreener, Binance, Solana RPC.

## Fit
Shows the solver side of an intent-based DEX. Small and unmaintained since 2024.
