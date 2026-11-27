# money-legos

https://github.com/studydefi/money-legos. License MIT. Stars 1,027. Last push 2024-12-09. Solidity and TypeScript. Checked 2026-11-27.

## Architecture
npm package `@studydefi/money-legos` v2.4.2. `src/` has one folder per protocol, each with `abi/`, `contracts/` (Solidity interfaces), `contracts.ts` and `index.ts`: Maker, Compound, Aave, Uniswap V1 and V2, Synthetix, dYdX, Curve, Balancer, mStable, 1inch (onesplit), Kyber, UMA, Idle, Dappsys and ERC20. `scripts/` regenerates mainnet address overviews and pulls ABIs from UMA.

## Data Layer
Static ABIs and mainnet addresses exported as TypeScript constants. No runtime data.

## Event Loop
None.

## Execution
None in the package. Solidity interfaces let a flash-loan or arbitrage contract call these protocols, and ethers.js code pairs the addresses with ABIs.

## Risk
None.

## Strategies Shipped
None. Jest tests fork mainnet and exercise each protocol's interface, for example a Uniswap swap, a Maker vault and a Compound supply.

## AI Components
None.

## Connectors
Ethereum mainnet contracts of the protocols listed above.

## Fit
Address and ABI registry for building DeFi legs in ethers.js or Solidity. Contracts date from 2020 to 2021, so verify addresses and protocol versions before use.
