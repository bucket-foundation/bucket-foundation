# Uniswap Arbitrage Analysis

https://github.com/ccyanxyz/uniswap-arbitrage-analysis. License none. Stars 2,121. Last push 2025-12-11. Python and Solidity. Checked 2026-11-27.

## Architecture
`src/dfs.py` searches token cycles over pool graphs, `src/events.py` and `rpc.py` follow swap events, `src/main.py` drives the scan, `src/contract/flat.sol` executes. Documented in `readme.md` with a PDF.

## Data Layer
On-chain pool reserves via JSON-RPC and event logs.

## Event Loop
Event-driven scan with threads (`thread.py`).

## Execution
Executes through a flat arbitrage contract.

## Risk
Profit threshold only.

## Strategies Shipped
Depth-first search for profitable cycles through Uniswap V2 pools with optimal input size.

## AI Components
None.

## Connectors
Uniswap V2.

## Fit
Good write-up of cycle arbitrage mechanics. Unlicensed.
