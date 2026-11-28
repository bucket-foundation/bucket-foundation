# defi-sdk

https://github.com/zeriontech/defi-sdk. License LGPL-3.0. Stars 843. Last push 2026-10-15. Solidity with Hardhat and TypeScript scripts. Checked 2026-11-27.

## Architecture
Smart contracts. `contracts/router/Router.sol` (512 lines) takes input tokens, calls a chosen caller contract with calldata, checks output and emits an event. `ProtocolFee.sol` and `SignatureVerifier.sol` handle fees and signed requests. `contracts/callers/` has `SimpleCaller`, `SimpleCallerWithPermit2`, `UniswapV2Caller` and `UniswapV3Caller`. `shared/` holds `TokensHandler`, `Permit2` and `Weth`.

## Data Layer
On-chain only. Account signatures and nonces tracked in the router; fee defaults stored by the owner.

## Event Loop
None. Each swap is one `execute` transaction.

## Execution
`execute` with an absolute or relative input amount, EIP-2612, DAI, Yearn or Permit2 permits, and a signed fee override. The caller contract performs the swap on the target DEX and the router verifies returned amounts against minimums.

## Risk
Output minimums checked with revert-safe transfers, signature expiry and cancellation (`cancelAccountSignature`), a capped protocol fee set by owner, and `slither.db.json` static analysis output.

## Strategies Shipped
None.

## AI Components
None.

## Connectors
Uniswap V2 and V3 routers, WETH, Permit2. Deploy scripts target zkSync Era.

## Fit
Compact swap router pattern with permit handling and signed fees. The older balance-query adapter system the README mentions has moved out of this tree.
