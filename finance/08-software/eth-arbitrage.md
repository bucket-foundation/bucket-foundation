# eth-arbitrage

https://github.com/Devilla/eth-arbitrage. License not stated. Stars 407. Last push 2026-03-16. Solidity with Hardhat. Checked 2026-11-27.

## Architecture
Ten files. `contracts/TradingBot.sol` holds `DyDxFlashLoan` and `TradingBot`; `Lock.sol` is the Hardhat template; `scripts/deploy.js`; `hardhat.config.js`.

## Data Layer
None on chain beyond reads. Caller passes 0x order data and 1inch (OneSplit) distribution arrays computed off chain.

## Event Loop
None. Owner transactions trigger `getFlashloan`, `arb` or `trade`.

## Execution
dYdX flash loan (`operate` with withdraw, call, deposit actions) of WETH, SAI, USDC or DAI. `_trade` swaps on the 0x exchange, then `_arb` swaps back through OneSplit and checks the proceeds.

## Risk
`onlyOwner` modifier and a loan received check. No sizing or slippage guard beyond the `oneSplitMinReturn` argument.

## Strategies Shipped
Two-venue arbitrage between 0x and OneSplit with flash-loaned capital.

## AI Components
None.

## Connectors
dYdX Solo margin pool, 0x v3 exchange, OneSplit aggregator, ERC-20 tokens, all Ethereum mainnet addresses from 2020.

## Fit
Historical example of flash-loan arbitrage plumbing. dYdX Solo and 0x v3 are retired venues. No off-chain searcher is included.
