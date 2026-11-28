# uniswap-sushiswap-arbitrage-bot

https://github.com/6eer/uniswap-sushiswap-arbitrage-bot. License MIT License. Stars 608. Last Push 2021-12-30. JavaScript and Solidity. Checked 2026-11-27.

## Architecture
`src/bot_flashswap.js`, `src/bot_normalswap.js`, `src/demo_environment.js` and three contracts: `Arbitrager.sol`, `Utils.sol`, `FullMath.sol`. Truffle project; the README states it is unmaintained.

## Data Layer
Pair reserves come from the chain through web3 for one user-chosen token pair on Uniswap V2 and Sushiswap.

## Event Loop
Subscribes to new block headers and evaluates the pair on each block.

## Execution
Flash swap bot borrows through `uniswapV2Call` in `Arbitrager.sol` and repays inside one transaction. The normal swap bot trades from held tokens and costs less gas. Both sign and send transactions with a private key.

## Risk
Skips the trade when estimated profit after gas cost is zero or negative. No exposure caps.

## Strategies Shipped
Two-pool arbitrage: `computeProfitMaximizingTrade` in `Utils.sol` picks direction and size from both pools' reserves.

## AI Components
None.

## Connectors
Ethereum node over web3, with a local mainnet fork for the demo.

## Fit
Clear reference for the V2 constant-product arbitrage formula and flash swap callback. Public mempool bots of this form lose to block builders today.
