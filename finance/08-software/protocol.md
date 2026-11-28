# protocol

https://github.com/enzymefinance/protocol. License GPL-3.0 (Enzyme Foundation may relicense internally). Stars 561. Last push 2026-09-25. Solidity. Checked 2026-11-27.

## Architecture
Foundry project. `contracts/persistent` holds long-lived pieces: `dispatcher`, `address-list-registry`, `external-positions`, `fund-value-calculator`, `global-config`, value oracles. `contracts/release` holds the versioned release: `core/fund` (`comptroller`, `vault`), `extensions`, `infrastructure`, `peripheral`.

## Data Layer
On-chain only. Chainlink aggregators price assets through value interpreters. `fund-value-calculator` computes net asset value and share price.

## Event Loop
None. Calls come from managers and depositors through a `ComptrollerProxy` per fund.

## Execution
Fund managers trade through the `integration-manager` using adapters. `external-position-manager` handles lending and staking positions. External interfaces cover Aave V3, Morpho Blue, Uniswap V3, 1inch, ParaSwap, 0x, Lido and Convex.

## Risk
`policy-manager` policies: allowed adapters, cumulative slippage tolerance, allowed redemption assets, min and max investment, allowed deposit recipients, no depeg on redemption.

## Strategies Shipped
None. The protocol is the fund container. Fees live in `fee-manager/fees`: management, performance, entrance, exit.

## AI Components
None.

## Connectors
Ethereum DeFi venues listed above, via adapters.

## Fit
Production on-chain asset management stack with mature policy and fee modules. Use as a model for permissioned fund rules.
