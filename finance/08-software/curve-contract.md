# curve-contract

https://github.com/curvefi/curve-contract. License all rights reserved except per-file headers (listed Other). Stars 1,118. Last push 2025-05-29. Vyper with Python tests. Checked 2026-11-27.

## Architecture
Smart contracts. `contracts/pools/<name>/` holds one StableSwap pool per folder (3pool, aave, compound, steth, sbtc, susd and about 30 more) with pool contract, deposit zap and `pooldata.json`. `contracts/pool-templates/`, `contracts/tokens/` (LP token) and `contracts/testing/` mocks. Brownie project.

## Data Layer
On-chain pool balances and rate multipliers. Pool parameters in `pooldata.json`.

## Event Loop
None. Each call is a transaction.

## Execution
`exchange`, `add_liquidity`, `remove_liquidity`, `remove_liquidity_imbalance`, `remove_liquidity_one_coin`. The invariant solver is `get_D` with `get_y` iterating on amplification `A`. Lending pools wrap aTokens or cTokens through `exchange_underlying`.

## Risk
Fee and admin fee capped by `MAX_FEE` and `MAX_ADMIN_FEE`. `A` ramps with a 10x change limit. Fee and ownership changes wait `ADMIN_ACTIONS_DELAY` of 3 days. Slippage guards `min_dy` and `min_mint_amount`; reentrancy tests exist.

## Strategies Shipped
None. The StableSwap invariant is the pricing rule.

## AI Components
None.

## Connectors
Aave, Compound, Lido stETH, Synthetix and ERC20 token mocks.

## Fit
Reference source for stable-asset AMM math and pool variants. Brownie tests include a Python simulation of the invariant in `tests/simulation.py`.
