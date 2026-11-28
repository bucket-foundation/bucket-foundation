# defi

https://github.com/gauss314/defi. License MIT License. Stars 614. Last Push 2024-03-02. Python. Checked 2026-11-27.

## Architecture
One module, `defi/defi_tools.py`, of plain functions published as a pip package, with a `setup.py` and sample images of loss surfaces and top dapps. Function names fall into three groups: loss math (`iloss`), CoinGecko pulls (`gecko*`) and PancakeSwap pulls (`pcs*`).

## Data Layer
CoinGecko (prices, markets, history, ID list), DeFiLlama protocol listings and charts and PancakeSwap API (summary, tokens, pairs) returned as pandas frames.

## Event Loop
None. Calls are one-shot.

## Execution
None.

## Risk
`iloss` computes impermanent loss for a price ratio, analytically or numerically. `iloss_simulate` and `compare` apply it to token pairs and pool rewards.

## Strategies Shipped
`farmSimulate` replays a liquidity pool position at a given APR over historical prices and reports value against holding.

## AI Components
None.

## Connectors
CoinGecko, PancakeSwap, protocol APIs.

## Fit
Quick impermanent loss and farming calculators for notebooks. Dependent on third-party endpoints that have changed since 2024.
