# amm-arbitrageur

https://github.com/paco0x/amm-arbitrageur. License WTFPL. Stars 1,988. Last push 2022-12-07. Solidity and TypeScript. Checked 2026-11-27.

## Architecture
`contracts/FlashBot.sol` borrows from a Uniswap V2 pair via flash swap, sells on another pair, repays and keeps the difference. `bot/` TypeScript scans `pairs-bsc.json` pools and calls the contract; Hardhat tests.

## Data Layer
Pair reserves from chain state.

## Event Loop
Block-by-block scan loop.

## Execution
Flash swap transaction with profit check inside the contract.

## Risk
Contract reverts if profit is below gas cost.

## Strategies Shipped
Two-pool price difference arbitrage using flash swaps.

## AI Components
None.

## Connectors
Uniswap V2 forks on BSC and Ethereum.

## Fit
Minimal DEX arbitrage reference. Archived. MEV competition makes the edge small.
